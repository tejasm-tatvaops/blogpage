import { NextResponse } from "next/server";
import { createSiteJournal, createSiteJournalSchema, getProjectJournalsPersistent } from "@/lib/siteJournalService";
import { getIdentityKeyFromSessionOrRequest } from "@/lib/auth/identity";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") ?? undefined;
    const city = searchParams.get("city") ?? undefined;
    const projectType = searchParams.get("projectType") ?? undefined;
    const riskParam = searchParams.get("risk");
    const risk = riskParam === "watch" || riskParam === "risk" || riskParam === "stable" ? riskParam : "all";
    const includeUnpublished = searchParams.get("includeUnpublished") === "true";
    const ownerId = searchParams.get("ownerId") ?? undefined;
    const journals = await getProjectJournalsPersistent({ q, city, projectType, risk, includeUnpublished, ownerId });
    return NextResponse.json({ journals }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch site journals." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const parsed = createSiteJournalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }
    const ownerId = await getIdentityKeyFromSessionOrRequest(request);
    const journal = await createSiteJournal(parsed.data, ownerId);
    return NextResponse.json({ journal }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create site journal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
