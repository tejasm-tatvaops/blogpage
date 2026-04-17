import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { getFeedMetrics, getFeedObservabilityHealth } from "@/lib/feedObservability";
import { getReconciliationHealth, runReconciliationNow, startReconciliationWorker } from "@/lib/reconciliationService";

export async function GET(request: Request) {
  const allowed = await requireAdminApiAccess();
  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const windowHours = Math.min(168, Math.max(1, Number(searchParams.get("hours") ?? "24")));
  const runReconcile = searchParams.get("reconcile") === "1";
  startReconciliationWorker();
  if (runReconcile) {
    await runReconciliationNow();
  }
  const metrics = await getFeedMetrics(windowHours);
  return NextResponse.json({
    window_hours: windowHours,
    ...metrics,
    health: {
      feed_events: getFeedObservabilityHealth(),
      reconciliation: getReconciliationHealth(),
    },
  });
}
