import { NextResponse } from "next/server";
import { SiteJournalModel } from "@/models/SiteJournal";
import { SiteJournalEntryModel } from "@/models/SiteJournalEntry";
import { connectToDatabase } from "@/lib/mongodb";
import { deleteOwnCommentById } from "@/lib/services/comment.service";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";

async function verifyEntry(slug: string, entryId: string) {
  await connectToDatabase();
  const journal = await SiteJournalModel.findOne({ slug }).select("_id").lean();
  if (!journal) return { error: "Site journal not found.", status: 404 as const };
  const entry = await SiteJournalEntryModel.findOne({ _id: entryId, journal_id: journal._id.toString() })
    .select("_id")
    .lean();
  if (!entry) return { error: "Site journal entry not found.", status: 404 as const };
  return { ok: true };
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; entryId: string; commentId: string }> },
) {
  const { slug, entryId, commentId } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const decodedEntryId = decodeURIComponent(entryId);
  const decodedCommentId = decodeURIComponent(commentId);

  const verified = await verifyEntry(decodedSlug, decodedEntryId);
  if ("error" in verified) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const actorKey = await getIdentityKeyFromSessionOrRequest(request);
  const deleted = await deleteOwnCommentById(decodedCommentId, actorKey);
  if (deleted.status === "forbidden") {
    return NextResponse.json({ error: "You can only delete your own field note." }, { status: 403 });
  }
  if (deleted.status === "not_found") {
    return NextResponse.json({ error: "Field note not found." }, { status: 404 });
  }
  if (deleted.status !== "deleted") {
    return NextResponse.json({ error: "Failed to delete field note." }, { status: 500 });
  }
  if (deleted.deleted.post_id !== decodedEntryId) {
    return NextResponse.json({ error: "Field note does not belong to this entry." }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
