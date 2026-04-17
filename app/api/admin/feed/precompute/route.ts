import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { runFeedPrecomputeNow } from "@/lib/feedPrecompute";

export async function POST() {
  const allowed = await requireAdminApiAccess();
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await runFeedPrecomputeNow();
  return NextResponse.json({ ok: true });
}
