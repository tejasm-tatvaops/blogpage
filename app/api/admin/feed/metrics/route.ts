import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { getFeedMetrics } from "@/lib/feedObservability";

export async function GET(request: Request) {
  const allowed = await requireAdminApiAccess();
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const windowHours = Math.min(168, Math.max(1, Number(searchParams.get("hours") ?? "24")));
  const metrics = await getFeedMetrics(windowHours);
  return NextResponse.json({ window_hours: windowHours, ...metrics });
}
