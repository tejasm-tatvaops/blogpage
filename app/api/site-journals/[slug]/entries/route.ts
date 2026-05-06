import { NextResponse } from "next/server";
import { addSiteJournalEntry, createSiteJournalEntrySchema } from "@/lib/siteJournalService";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = createSiteJournalEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    const { slug } = await params;
    const actorId = await getIdentityKeyFromSessionOrRequest(request);
    const journal = await addSiteJournalEntry(slug, parsed.data, actorId);
    return NextResponse.json({ journal }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add site journal entry.";
    if (message.includes("permission")) return NextResponse.json({ error: message }, { status: 403 });
    if (message.includes("not found")) return NextResponse.json({ error: message }, { status: 404 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
