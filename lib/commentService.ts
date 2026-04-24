import { isValidObjectId } from "mongoose";
import { z } from "zod";
import { CommentModel, type CommentDocument } from "@/models/Comment";
import { PositiveMentionCounterModel } from "@/models/PositiveMentionCounter";
import { ForumPostModel } from "@/models/ForumPost";
import { createNotification } from "@/lib/notificationService";
import { connectToDatabase } from "./mongodb";

export type Comment = {
  id: string;
  identity_key: string | null;
  parent_comment_id: string | null;
  author_name: string;
  persona_name: string | null;
  content: string;
  is_ai_generated: boolean;
  is_deleted: boolean;
  created_at: string;
  upvote_count: number;
  downvote_count: number;
  score: number;
  replies: Comment[];
};

export type AdminComment = {
  id: string;
  post_id: string;
  comment_type: "blog" | "forum";
  parent_comment_id: string | null;
  author_name: string;
  persona_name: string | null;
  content: string;
  is_ai_generated: boolean;
  created_at: string;
  upvote_count: number;
  downvote_count: number;
};

const notDeleted = { deleted_at: null };
const AUTHOR_KEY_SANITIZE = /[^a-z0-9]+/g;

const deriveCommentIdentityKey = (doc: {
  identity_key?: string | null;
  author_name?: string | null;
}): string | null => {
  const direct = doc.identity_key?.trim();
  if (direct) return direct;
  const author = doc.author_name?.toLowerCase().trim();
  if (!author) return null;
  const slug = author.replace(AUTHOR_KEY_SANITIZE, "-").replace(/^-|-$/g, "");
  return slug ? `author:${slug}` : null;
};

const toComment = (doc: CommentDocument): Comment => {
  const deleted = Boolean(doc.deleted_at);
  return {
    id: doc._id.toString(),
    identity_key: deriveCommentIdentityKey(doc),
    parent_comment_id: doc.parent_comment_id ?? null,
    author_name: deleted ? "[deleted]" : doc.author_name,
    persona_name: deleted ? null : (doc.persona_name ?? null),
    content: deleted ? "[deleted]" : doc.content,
    is_ai_generated: doc.is_ai_generated ?? false,
    is_deleted: deleted,
    created_at: doc.created_at.toISOString(),
    upvote_count: deleted ? 0 : (doc.upvote_count ?? 0),
    downvote_count: deleted ? 0 : (doc.downvote_count ?? 0),
    score: deleted ? 0 : ((doc.upvote_count ?? 0) - (doc.downvote_count ?? 0)),
    replies: [],
  };
};

export const commentInputSchema = z.object({
  author_name: z
    .string()
    .min(1, "Name is required")
    .max(80, "Name too long")
    .trim(),
  content: z
    .string()
    .min(3, "Comment must be at least 3 characters")
    .max(2000, "Comment too long")
    .trim(),
  parent_comment_id: z.string().optional().nullable(),
  is_ai_generated: z.boolean().optional().default(false),
  persona_name: z.string().max(120).optional().nullable(),
});

export type CommentInput = z.infer<typeof commentInputSchema>;

export const getComments = async (postId: string): Promise<Comment[]> => {
  await connectToDatabase();
  // Fetch all comments including soft-deleted so replies to deleted parents still appear.
  const docs = (await CommentModel.find({ post_id: postId })
    .sort({ created_at: 1 })
    .limit(500)
    .lean()) as unknown as CommentDocument[];
  const mapped = docs.map(toComment);

  const byId = new Map(mapped.map((c) => [c.id, c]));
  const rootComments = mapped.filter((comment) => !comment.parent_comment_id);
  const repliesByParent = new Map<string, Comment[]>();
  for (const comment of mapped) {
    if (!comment.parent_comment_id) continue;
    const bucket = repliesByParent.get(comment.parent_comment_id) ?? [];
    bucket.push(comment);
    repliesByParent.set(comment.parent_comment_id, bucket);
  }

  const sortByDate = (a: Comment, b: Comment) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

  for (const root of rootComments) {
    const depth1 = (repliesByParent.get(root.id) ?? []).sort(sortByDate);
    for (const reply of depth1) {
      reply.replies = (repliesByParent.get(reply.id) ?? []).sort(sortByDate);
    }
    root.replies = depth1;
  }

  // Promote orphaned replies (parent was deleted and has no children itself) as a
  // fallback: attach them under a synthetic deleted-parent stub only if not already
  // reachable via rootComments.
  const reachableIds = new Set<string>();
  for (const root of rootComments) {
    reachableIds.add(root.id);
    for (const r of root.replies) {
      reachableIds.add(r.id);
      for (const n of r.replies) reachableIds.add(n.id);
    }
  }
  for (const comment of mapped) {
    if (reachableIds.has(comment.id)) continue;
    // Orphaned: parent missing from rootComments (deleted & itself had a parent)
    if (comment.parent_comment_id) {
      const parent = byId.get(comment.parent_comment_id);
      if (parent && reachableIds.has(parent.id)) {
        parent.replies.push(comment);
        reachableIds.add(comment.id);
      }
    }
  }

  return rootComments.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
};

export const addComment = async (postId: string, input: CommentInput): Promise<Comment> => {
  await connectToDatabase();
  const parentId = input.parent_comment_id?.trim() || null;

  if (parentId) {
    if (!isValidObjectId(parentId)) {
      throw new Error("Invalid parent comment.");
    }

    const parent = (await CommentModel.findOne({
      _id: parentId,
      post_id: postId,
      ...notDeleted,
    })
      .select("_id parent_comment_id")
      .lean()) as Pick<CommentDocument, "_id" | "parent_comment_id"> | null;

    if (!parent) {
      throw new Error("Parent comment not found.");
    }
    if (parent.parent_comment_id) {
      // parent is depth 1; new comment would be depth 2 — allowed.
      // Ensure grandparent has no parent (block depth 3+).
      const grandparent = (await CommentModel.findById(parent.parent_comment_id)
        .select("parent_comment_id")
        .lean()) as { parent_comment_id?: string | null } | null;
      if (grandparent?.parent_comment_id) {
        throw new Error("Maximum reply depth reached.");
      }
    }
  }

  const doc = await CommentModel.create({
    post_id: postId,
    parent_comment_id: parentId,
    identity_key: null,
    author_name: input.author_name,
    persona_name: input.persona_name ?? null,
    content: input.content,
    is_ai_generated: input.is_ai_generated ?? false,
    upvote_count: 0,
    downvote_count: 0,
    deleted_at: null,
  });
  const created = toComment(doc.toObject() as unknown as CommentDocument);

  if (parentId) {
    const parent = (await CommentModel.findById(parentId).select("author_name identity_key").lean()) as
      | { author_name?: string; identity_key?: string | null }
      | null;
    const parentAuthor = parent?.author_name?.trim();
    const parentRecipientKey = String(parent?.identity_key ?? "").trim();
    if (parentAuthor && parentAuthor !== input.author_name && parentRecipientKey) {
      await createNotification({
        type: "reply",
        post_id: postId,
        comment_id: created.id,
        recipient_key: parentRecipientKey,
        message: `${input.author_name} replied to your comment.`,
      });
    }
  } else {
    const forumPost = (await ForumPostModel.findById(postId)
      .select("creator_fingerprint")
      .lean()) as { creator_fingerprint?: string | null } | null;
    if (forumPost?.creator_fingerprint) {
      await createNotification({
        type: "comment",
        post_id: postId,
        comment_id: created.id,
        recipient_key: `fp:${forumPost.creator_fingerprint}`,
        message: `${input.author_name} commented on a post you are watching.`,
      });
    }
  }
  return created;
};

export const addCommentWithIdentity = async (
  postId: string,
  input: CommentInput,
  identityKey: string | null,
  options?: { isPositiveTatvaMention?: boolean },
): Promise<Comment> => {
  await connectToDatabase();
  const parentId = input.parent_comment_id?.trim() || null;

  if (parentId) {
    if (!isValidObjectId(parentId)) {
      throw new Error("Invalid parent comment.");
    }

    const parent = (await CommentModel.findOne({
      _id: parentId,
      post_id: postId,
      ...notDeleted,
    })
      .select("_id parent_comment_id")
      .lean()) as Pick<CommentDocument, "_id" | "parent_comment_id"> | null;

    if (!parent) {
      throw new Error("Parent comment not found.");
    }
    if (parent.parent_comment_id) {
      const grandparent = (await CommentModel.findById(parent.parent_comment_id)
        .select("parent_comment_id")
        .lean()) as { parent_comment_id?: string | null } | null;
      if (grandparent?.parent_comment_id) {
        throw new Error("Maximum reply depth reached.");
      }
    }
  }

  const doc = await CommentModel.create({
    post_id: postId,
    parent_comment_id: parentId,
    identity_key: identityKey?.trim() || null,
    author_name: input.author_name,
    persona_name: input.persona_name ?? null,
    content: input.content,
    is_positive_tatva_mention: options?.isPositiveTatvaMention === true,
    is_ai_generated: input.is_ai_generated ?? false,
    upvote_count: 0,
    downvote_count: 0,
    deleted_at: null,
  });
  const created = toComment(doc.toObject() as unknown as CommentDocument);

  if (parentId) {
    const parent = (await CommentModel.findById(parentId).select("author_name identity_key").lean()) as
      | { author_name?: string; identity_key?: string | null }
      | null;
    const parentAuthor = parent?.author_name?.trim();
    const parentRecipientKey = String(parent?.identity_key ?? "").trim();
    if (parentAuthor && parentAuthor !== input.author_name && parentRecipientKey) {
      await createNotification({
        type: "reply",
        post_id: postId,
        comment_id: created.id,
        recipient_key: parentRecipientKey,
        message: `${input.author_name} replied to your comment.`,
      });
    }
  } else {
    const forumPost = (await ForumPostModel.findById(postId)
      .select("creator_fingerprint")
      .lean()) as { creator_fingerprint?: string | null } | null;
    if (forumPost?.creator_fingerprint) {
      await createNotification({
        type: "comment",
        post_id: postId,
        comment_id: created.id,
        recipient_key: `fp:${forumPost.creator_fingerprint}`,
        message: `${input.author_name} commented on a post you are watching.`,
      });
    }
  }
  return created;
};

export const voteComment = async (
  postId: string,
  commentId: string,
  direction: "up" | "down",
): Promise<Pick<Comment, "id" | "upvote_count" | "downvote_count" | "score"> | null> => {
  await connectToDatabase();
  if (!isValidObjectId(commentId)) return null;

  const field = direction === "up" ? "upvote_count" : "downvote_count";
  const updated = (await CommentModel.findOneAndUpdate(
    { _id: commentId, post_id: postId, ...notDeleted },
    { $inc: { [field]: 1 } },
    { new: true },
  ).lean()) as CommentDocument | null;

  if (!updated) return null;

  const up = updated.upvote_count ?? 0;
  const down = updated.downvote_count ?? 0;
  return {
    id: updated._id.toString(),
    upvote_count: up,
    downvote_count: down,
    score: up - down,
  };
};

export const getCommentsForAdmin = async ({
  page = 1,
  limit = 100,
  type = "all",
}: {
  page?: number;
  limit?: number;
  type?: "all" | "blog" | "forum";
} = {}): Promise<AdminComment[]> => {
  await connectToDatabase();
  const safeLimit = Math.min(Math.max(1, limit), 200);
  const skip = (Math.max(1, page) - 1) * safeLimit;
  const docs = (await CommentModel.find({ ...notDeleted })
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(safeLimit)
    .lean()) as unknown as CommentDocument[];

  const candidateForumPostIds = Array.from(
    new Set(docs.map((doc) => doc.post_id).filter((value) => isValidObjectId(value))),
  );
  const forumIds = new Set<string>();
  if (candidateForumPostIds.length > 0) {
    const forumDocs = await ForumPostModel.find({
      _id: { $in: candidateForumPostIds },
      deleted_at: null,
    })
      .select("_id")
      .lean();
    for (const forumDoc of forumDocs as Array<{ _id: { toString(): string } }>) {
      forumIds.add(forumDoc._id.toString());
    }
  }

  const mapped = docs.map((doc) => ({
    id: doc._id.toString(),
    post_id: doc.post_id,
    comment_type: forumIds.has(doc.post_id) ? ("forum" as const) : ("blog" as const),
    parent_comment_id: doc.parent_comment_id ?? null,
    author_name: doc.author_name,
    persona_name: doc.persona_name ?? null,
    content: doc.content,
    is_ai_generated: doc.is_ai_generated ?? false,
    created_at: doc.created_at.toISOString(),
    upvote_count: doc.upvote_count ?? 0,
    downvote_count: doc.downvote_count ?? 0,
  }));

  if (type === "all") return mapped;
  return mapped.filter((comment) => comment.comment_type === type);
};

export const deleteCommentById = async (commentId: string): Promise<boolean> => {
  await connectToDatabase();
  if (!isValidObjectId(commentId)) return false;

  const result = await CommentModel.findOneAndUpdate(
    { _id: commentId, ...notDeleted },
    { deleted_at: new Date() },
    { new: false },
  )
    .select("_id")
    .lean();

  return Boolean(result);
};

export type DeleteOwnCommentOutcome =
  | {
    status: "deleted";
    deleted: {
      id: string;
      post_id: string;
      identity_key: string;
      content: string;
      is_positive_tatva_mention: boolean;
    };
  }
  | { status: "forbidden" | "not_found" };

export const deleteOwnCommentById = async (
  commentId: string,
  identityKey: string,
): Promise<DeleteOwnCommentOutcome> => {
  await connectToDatabase();
  if (!isValidObjectId(commentId) || !identityKey.trim()) return { status: "not_found" };

  const existing = await CommentModel.findOne({ _id: commentId, ...notDeleted })
    .select("identity_key post_id content is_positive_tatva_mention")
    .lean();

  if (!existing) return { status: "not_found" };
  if (String(existing.identity_key ?? "") !== identityKey.trim()) return { status: "forbidden" };

  const result = await CommentModel.findOneAndUpdate(
    { _id: commentId, ...notDeleted },
    { deleted_at: new Date() },
    { new: false },
  )
    .select("_id")
    .lean();

  if (!result) return { status: "not_found" };

  return {
    status: "deleted",
    deleted: {
      id: commentId,
      post_id: String(existing.post_id ?? ""),
      identity_key: String(existing.identity_key ?? ""),
      content: String(existing.content ?? ""),
      is_positive_tatva_mention: Boolean(existing.is_positive_tatva_mention),
    },
  };
};

export const incrementPositiveMentionCounter = async (
  identityKey: string,
  postSlug: string,
): Promise<number> => {
  await connectToDatabase();
  if (!identityKey.trim() || !postSlug.trim()) return 0;

  const updated = await PositiveMentionCounterModel.findOneAndUpdate(
    {
      identity_key: identityKey.trim(),
      post_slug: postSlug.trim(),
    },
    {
      $setOnInsert: {
        identity_key: identityKey.trim(),
        post_slug: postSlug.trim(),
        qualifying_count: 0,
      },
      $inc: { qualifying_count: 1 },
    },
    { new: true, upsert: true },
  )
    .select("qualifying_count")
    .lean();

  return Number(updated?.qualifying_count ?? 0);
};

export const decrementPositiveMentionCounter = async (
  identityKey: string,
  postSlug: string,
): Promise<number> => {
  await connectToDatabase();
  if (!identityKey.trim() || !postSlug.trim()) return 0;

  const updated = await PositiveMentionCounterModel.findOneAndUpdate(
    {
      identity_key: identityKey.trim(),
      post_slug: postSlug.trim(),
    },
    [
      {
        $set: {
          qualifying_count: {
            $max: [{ $subtract: [{ $ifNull: ["$qualifying_count", 0] }, 1] }, 0],
          },
        },
      },
    ],
    { new: true },
  )
    .select("qualifying_count")
    .lean();

  if (!updated) return -1;
  return Number(updated.qualifying_count ?? 0);
};

export const seedPositiveMentionCounterFromComments = async (
  identityKey: string,
  postId: string,
  postSlug: string,
): Promise<number> => {
  await connectToDatabase();
  if (!identityKey.trim() || !postId.trim() || !postSlug.trim()) return 0;

  const qualifyingCount = await CommentModel.countDocuments({
    post_id: postId,
    identity_key: identityKey.trim(),
    is_positive_tatva_mention: true,
    ...notDeleted,
  });

  await PositiveMentionCounterModel.findOneAndUpdate(
    { identity_key: identityKey.trim(), post_slug: postSlug.trim() },
    {
      $set: {
        identity_key: identityKey.trim(),
        post_slug: postSlug.trim(),
        qualifying_count: qualifyingCount,
      },
    },
    { upsert: true, new: true },
  );

  return Number(qualifyingCount);
};

export const getCommentMetaById = async (
  commentId: string,
): Promise<{ post_id: string } | null> => {
  await connectToDatabase();
  if (!isValidObjectId(commentId)) return null;
  const result = await CommentModel.findOne({ _id: commentId, ...notDeleted })
    .select("post_id")
    .lean();
  if (!result?.post_id) return null;
  return { post_id: result.post_id };
};
