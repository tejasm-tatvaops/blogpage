import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { getSiteJournalsForAdmin } from "@/lib/siteJournalService";

export async function GET(request: Request) {
  const isAdmin = await requireAdminApiAccess();
  if (!isAdmin) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const q = searchParams.get("q") ?? undefined;
    const journals = await getSiteJournalsForAdmin({ status, q });
    return NextResponse.json({ journals }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch site journals." }, { status: 500 });
  }
}
