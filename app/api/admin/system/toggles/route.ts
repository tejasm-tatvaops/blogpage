import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { getSystemToggles, setSystemToggles } from "@/lib/systemToggles";
import { setLiveActivityEnabled } from "@/lib/activityRunner";

const schema = z.object({
  liveActivityEnabled:        z.boolean().optional(),
  notificationsEnabled:       z.boolean().optional(),
  personasEnabled:            z.boolean().optional(),
  shortsEnabled:              z.boolean().optional(),
  reputationEnabled:          z.boolean().optional(),
  crossContentSignalsEnabled: z.boolean().optional(),
  peerReviewEnabled:          z.boolean().optional(),
  ingestionEnabled:           z.boolean().optional(),
  tutorialsEnabled:           z.boolean().optional(),
  autoDarkThemeEnabled:       z.boolean().optional(),
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid toggles payload." }, { status: 400 });
  }

  if (typeof parsed.data.liveActivityEnabled === "boolean") {
    setLiveActivityEnabled(parsed.data.liveActivityEnabled);
  }

  const toggles = setSystemToggles({
    notificationsEnabled:       parsed.data.notificationsEnabled,
    personasEnabled:            parsed.data.personasEnabled,
    shortsEnabled:              parsed.data.shortsEnabled,
    reputationEnabled:          parsed.data.reputationEnabled,
    crossContentSignalsEnabled: parsed.data.crossContentSignalsEnabled,
    peerReviewEnabled:          parsed.data.peerReviewEnabled,
    ingestionEnabled:           parsed.data.ingestionEnabled,
    tutorialsEnabled:           parsed.data.tutorialsEnabled,
    autoDarkThemeEnabled:       parsed.data.autoDarkThemeEnabled,
  });
  return NextResponse.json(toggles, { status: 200 });
}

export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);
  return NextResponse.json(getSystemToggles(), { status: 200 });
}
