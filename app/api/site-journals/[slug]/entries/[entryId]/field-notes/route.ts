import { NextResponse } from "next/server";
import { CommentModel } from "@/models/Comment";
import { SiteJournalModel } from "@/models/SiteJournal";
import { SiteJournalEntryModel } from "@/models/SiteJournalEntry";
import { connectToDatabase } from "@/lib/mongodb";
import { commentInputSchema, getComments, type Comment } from "@/lib/services/comment.service";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";

async function verifyEntry(slug: string, entryId: string) {
  await connectToDatabase();
  const journal = await SiteJournalModel.findOne({ slug }).select("_id").lean();
  if (!journal) return { error: "Site journal not found.", status: 404 as const };
  const entry = await SiteJournalEntryModel.findOne({ _id: entryId, journal_id: journal._id.toString() })
    .select("_id title week_number")
    .lean();
  if (!entry) return { error: "Site journal entry not found.", status: 404 as const };
  return { journalId: journal._id.toString(), entry };
}

const toOneLevelReplies = (comments: Comment[]): Comment[] =>
  comments.map((comment) => ({
    ...comment,
    replies: (comment.replies ?? []).map((reply) => ({ ...reply, replies: [] })),
  }));

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; entryId: string }> },
) {
  const { slug, entryId } = await params;
  const verified = await verifyEntry(decodeURIComponent(slug), decodeURIComponent(entryId));
  if ("error" in verified) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }
  const notes = await getComments(decodeURIComponent(entryId));
  return NextResponse.json({ notes: toOneLevelReplies(notes) }, { status: 200 });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; entryId: string }> },
) {
  const { slug, entryId } = await params;
  const verified = await verifyEntry(decodeURIComponent(slug), decodeURIComponent(entryId));
  if ("error" in verified) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  let body: unknown;
  try {
    body = (await request.json()) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
  const result = commentInputSchema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid input.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const actorKey = await getIdentityKeyFromSessionOrRequest(request);
  const parsedParentId = result.data.parent_comment_id?.trim() || null;
  if (parsedParentId) {
    const parent = await CommentModel.findOne({
      _id: parsedParentId,
      post_id: decodeURIComponent(entryId),
      deleted_at: null,
    })
      .select("parent_comment_id")
      .lean();
    if (!parent) return NextResponse.json({ error: "Parent field note not found." }, { status: 404 });
    if (parent.parent_comment_id) {
      return NextResponse.json({ error: "Only one-level replies are allowed in Field Notes." }, { status: 400 });
    }
  }

  const created = await CommentModel.create({
    post_id: decodeURIComponent(entryId),
    parent_comment_id: parsedParentId,
    identity_key: actorKey,
    author_name: result.data.author_name,
    persona_name: result.data.persona_name ?? null,
    content: result.data.content,
    is_ai_generated: false,
    upvote_count: 0,
    downvote_count: 0,
    deleted_at: null,
  });

  const notes = await getComments(decodeURIComponent(entryId));
  const justCreated = notes
    .flatMap((item) => [item, ...item.replies])
    .find((item) => item.id === created._id.toString()) ?? null;
  return NextResponse.json({ note: justCreated, notes: toOneLevelReplies(notes) }, { status: 201 });
}
