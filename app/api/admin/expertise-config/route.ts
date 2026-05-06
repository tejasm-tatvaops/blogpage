import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { getExpertiseConfig, updateExpertiseConfig } from "@/lib/expertiseConfigService";

const schema = z.object({
  professions: z.array(z.string().trim().min(1).max(80)).max(120),
  expertiseAreas: z.array(z.string().trim().min(1).max(80)).max(120),
  badgeLabels: z.array(z.string().trim().min(1).max(80)).max(180),
});

export async function GET(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);
  const config = await getExpertiseConfig();
  return NextResponse.json(config, { status: 200 });
}

export async function PUT(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  const updated = await updateExpertiseConfig(parsed.data, "Admin");
  return NextResponse.json(updated, { status: 200 });
}
