import { NextResponse } from "next/server";
import { getProjectBySlugPersistent, updateSiteJournalStatus } from "@/lib/siteJournalService";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const actor = await getIdentityKeyFromSessionOrRequest(request);
    const journal = await getProjectBySlugPersistent(slug, true);
    if (!journal) return NextResponse.json({ error: "Site journal not found." }, { status: 404 });
    if (journal.leadContributor.identityKey !== actor) {
      return NextResponse.json({ error: "Only journal owner can submit for review." }, { status: 403 });
    }
    const updated = await updateSiteJournalStatus(slug, "pending_review");
    return NextResponse.json({ journal: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to submit site journal." }, { status: 500 });
  }
}
