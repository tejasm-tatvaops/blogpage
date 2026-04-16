import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { getSystemToggles, setSystemToggles } from "@/lib/systemToggles";
import { setLiveActivityEnabled } from "@/lib/activityRunner";

const schema = z.object({
  liveActivityEnabled: z.boolean().optional(),
  notificationsEnabled: z.boolean().optional(),
  personasEnabled: z.boolean().optional(),
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
    notificationsEnabled: parsed.data.notificationsEnabled,
    personasEnabled: parsed.data.personasEnabled,
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
