import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { runResearchToTutorialPipeline } from "@/lib/researchPipelineService";

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const result = await runResearchToTutorialPipeline("admin:system", 5);
  return NextResponse.json({ ok: true, ...result }, { status: 200 });
}

