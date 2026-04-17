import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { errorResponse } from "@/lib/adminApi";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import {
  getReconciliationHealth,
  runReconciliationNow,
  startReconciliationWorker,
} from "@/lib/reconciliationService";

export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");
  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  startReconciliationWorker();
  return NextResponse.json({ ok: true, health: getReconciliationHealth() });
}

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return errorResponse(401, "Unauthorized");
  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  startReconciliationWorker();
  const summary = await runReconciliationNow();
  return NextResponse.json({ ok: true, summary });
}
