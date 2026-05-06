import { NextResponse } from "next/server";
import { getProjectBySlugPersistent } from "@/lib/siteJournalService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const journal = await getProjectBySlugPersistent(slug, true);
    if (!journal) return NextResponse.json({ error: "Site journal not found." }, { status: 404 });
    return NextResponse.json({ journal }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch site journal." }, { status: 500 });
  }
}
