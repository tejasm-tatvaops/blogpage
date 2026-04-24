/**
 * Revision Service — peer-review workflow for blog articles.
 *
 * Rules enforced here:
 *  - Only users with reputation_tier ≥ "expert" may approve/reject revisions.
 *  - A user cannot review their own proposal.
 *  - Approving a revision writes a new entry into Blog.versions[] and marks
 *    the revision as the live version.
 *  - Rollback restores a previously approved revision to the blog document.
 */

import { connectToDatabase } from "@/lib/db/mongodb";
import { ArticleRevisionModel, type RevisionStatus } from "@/models/ArticleRevision";
import { BlogModel } from "@/models/Blog";
import { UserProfileModel } from "@/models/UserProfile";
import { awardPoints } from "@/lib/services/reputation.service";

const REVIEWER_MIN_TIER = ["expert", "elite"] as const;

async function isEligibleReviewer(identityKey: string): Promise<boolean> {
  await connectToDatabase();
  const profile = await UserProfileModel.findOne({ identity_key: identityKey })
    .select("reputation_tier")
    .lean();
  const tier = (profile?.reputation_tier as string | undefined) ?? "member";
  return (REVIEWER_MIN_TIER as readonly string[]).includes(tier);
}

// ─── Propose an edit ─────────────────────────────────────────────────────────

export type ProposeEditInput = {
  blogSlug: string;
  proposerIdentityKey: string;
  proposerDisplayName: string;
  proposedTitle?: string | null;
  proposedContent: string;
  proposedExcerpt?: string | null;
  editSummary?: string | null;
};

export type ProposeEditResult =
  | { ok: true; revisionId: string }
  | { ok: false; reason: "blog_not_found" | "identical_content" };

export async function proposeEdit(input: ProposeEditInput): Promise<ProposeEditResult> {
  await connectToDatabase();

  const blog = await BlogModel.findOne({ slug: input.blogSlug, deleted_at: null }).lean();
  if (!blog) return { ok: false, reason: "blog_not_found" };

  const baseContent = (blog as unknown as { content: string }).content;
  if (input.proposedContent.trim() === baseContent.trim()) {
    return { ok: false, reason: "identical_content" };
  }

  const revision = await ArticleRevisionModel.create({
    blog_slug:  input.blogSlug,
    blog_id:    (blog as unknown as { _id: unknown })._id,
    proposed_title:   input.proposedTitle ?? null,
    proposed_content: input.proposedContent,
    proposed_excerpt: input.proposedExcerpt ?? null,
    base_title:   (blog as unknown as { title: string }).title,
    base_content: baseContent,
    base_excerpt: (blog as unknown as { excerpt: string | null }).excerpt ?? null,
    proposer_identity_key: input.proposerIdentityKey,
    proposer_display_name: input.proposerDisplayName,
    edit_summary: input.editSummary ?? null,
    status: "pending",
  });

  return { ok: true, revisionId: String(revision._id) };
}

// ─── Approve a revision ───────────────────────────────────────────────────────

export type ApproveRevisionResult =
  | { ok: true; versionNumber: number }
  | { ok: false; reason: "not_found" | "not_pending" | "unauthorized" | "self_review" };

export async function approveRevision(
  revisionId: string,
  reviewerIdentityKey: string,
  reviewerDisplayName: string,
  reviewerNote?: string | null,
): Promise<ApproveRevisionResult> {
  await connectToDatabase();

  const eligible = await isEligibleReviewer(reviewerIdentityKey);
  if (!eligible) return { ok: false, reason: "unauthorized" };

  const revision = await ArticleRevisionModel.findById(revisionId);
  if (!revision) return { ok: false, reason: "not_found" };
  if ((revision.status as string) !== "pending") return { ok: false, reason: "not_pending" };
  if ((revision.proposer_identity_key as string) === reviewerIdentityKey) {
    return { ok: false, reason: "self_review" };
  }

  // Apply revision to blog document
  const blogId = revision.blog_id;
  const updateFields: Record<string, unknown> = {
    content: revision.proposed_content,
  };
  if (revision.proposed_title) updateFields.title = revision.proposed_title;
  if (revision.proposed_excerpt) updateFields.excerpt = revision.proposed_excerpt;

  // Push a version snapshot (Blog.versions is select:false but $push works)
  const versionSnapshot = {
    title:   revision.proposed_title ?? revision.base_title,
    content: revision.proposed_content as string,
    excerpt: revision.proposed_excerpt ?? revision.base_excerpt ?? "",
    saved_at: new Date(),
  };

  const updatedBlog = await BlogModel.findByIdAndUpdate(
    blogId,
    {
      $set: updateFields,
      $push: { versions: versionSnapshot },
    },
    { new: true },
  ).lean();

  if (!updatedBlog) return { ok: false, reason: "not_found" };

  // Count existing approved revisions to assign version number
  const approvedCount = await ArticleRevisionModel.countDocuments({
    blog_id: blogId,
    status: "approved",
  });
  const versionNumber = approvedCount + 1;

  // Mark this revision as live, un-live others
  await ArticleRevisionModel.updateMany(
    { blog_id: blogId, is_live: true },
    { $set: { is_live: false } },
  );

  await ArticleRevisionModel.findByIdAndUpdate(revisionId, {
    $set: {
      status: "approved" as RevisionStatus,
      reviewer_identity_key: reviewerIdentityKey,
      reviewer_display_name: reviewerDisplayName,
      reviewer_note: reviewerNote ?? null,
      reviewed_at: new Date(),
      version_number: versionNumber,
      is_live: true,
    },
  });

  // Award reputation to proposer
  void awardPoints({
    identityKey: revision.proposer_identity_key as string,
    reason: "peer_helpful_vote",
    actorIdentityKey: reviewerIdentityKey,
    sourceContentSlug: revision.blog_slug as string,
    sourceContentType: "blog",
    note: `Revision approved by ${reviewerDisplayName}`,
  });

  return { ok: true, versionNumber };
}

// ─── Reject a revision ────────────────────────────────────────────────────────

export async function rejectRevision(
  revisionId: string,
  reviewerIdentityKey: string,
  reviewerDisplayName: string,
  reviewerNote?: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  await connectToDatabase();

  const eligible = await isEligibleReviewer(reviewerIdentityKey);
  if (!eligible) return { ok: false, reason: "unauthorized" };

  const revision = await ArticleRevisionModel.findById(revisionId);
  if (!revision) return { ok: false, reason: "not_found" };
  if ((revision.status as string) !== "pending") return { ok: false, reason: "not_pending" };
  if ((revision.proposer_identity_key as string) === reviewerIdentityKey) {
    return { ok: false, reason: "self_review" };
  }

  await ArticleRevisionModel.findByIdAndUpdate(revisionId, {
    $set: {
      status: "rejected" as RevisionStatus,
      reviewer_identity_key: reviewerIdentityKey,
      reviewer_display_name: reviewerDisplayName,
      reviewer_note: reviewerNote ?? null,
      reviewed_at: new Date(),
    },
  });

  return { ok: true };
}

// ─── Rollback to a previous revision ─────────────────────────────────────────

export async function rollbackToRevision(
  revisionId: string,
  adminNote?: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  await connectToDatabase();

  const revision = await ArticleRevisionModel.findById(revisionId);
  if (!revision) return { ok: false, reason: "not_found" };
  if ((revision.status as string) !== "approved") return { ok: false, reason: "not_approved" };

  await BlogModel.findByIdAndUpdate(revision.blog_id, {
    $set: {
      content: revision.proposed_content,
      ...(revision.proposed_title   ? { title:   revision.proposed_title }   : {}),
      ...(revision.proposed_excerpt ? { excerpt: revision.proposed_excerpt } : {}),
    },
  });

  // Mark previous live as rolled_back, this one as live
  await ArticleRevisionModel.updateMany(
    { blog_id: revision.blog_id, is_live: true },
    { $set: { is_live: false, status: "rolled_back" as RevisionStatus } },
  );
  await ArticleRevisionModel.findByIdAndUpdate(revisionId, {
    $set: { is_live: true, reviewer_note: adminNote ?? revision.reviewer_note },
  });

  return { ok: true };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getRevisionsForBlog(blogSlug: string, limit = 30) {
  await connectToDatabase();
  return ArticleRevisionModel.find({ blog_slug: blogSlug })
    .sort({ created_at: -1 })
    .limit(limit)
    .select("-base_content -proposed_content") // omit large fields for list view
    .lean();
}

export async function getRevisionById(revisionId: string) {
  await connectToDatabase();
  return ArticleRevisionModel.findById(revisionId).lean();
}

export async function getPendingRevisions(limit = 50, offset = 0) {
  await connectToDatabase();
  return ArticleRevisionModel.find({ status: "pending" })
    .sort({ created_at: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
}
