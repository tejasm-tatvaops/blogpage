import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import {
  ensureActivityRunnerStarted,
  getLiveActivityStatus,
  setLiveActivityEnabled,
} from "@/lib/activityRunner";

const toggleSchema = z.object({
  enabled: z.boolean(),
});

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = (await request.json()) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = toggleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "enabled must be a boolean." }, { status: 400 });
  }

  ensureActivityRunnerStarted();
  const state = setLiveActivityEnabled(parsed.data.enabled);
  return NextResponse.json(state, { status: 200 });
}

export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  ensureActivityRunnerStarted();
  return NextResponse.json(getLiveActivityStatus(), { status: 200 });
}
