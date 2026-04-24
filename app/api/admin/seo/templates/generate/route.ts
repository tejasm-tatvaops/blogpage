import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { generateSeoTemplateDraft } from "@/lib/programmaticSeoService";

const schema = z.object({
  templateType: z.enum(["vs", "what-is", "best-tools"]),
  topic: z.string().trim().min(2).max(180),
  compareTo: z.string().trim().max(180).optional(),
});

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  const draft = await generateSeoTemplateDraft({
    identityKey: "admin:system",
    templateType: parsed.data.templateType,
    topic: parsed.data.topic,
    compareTo: parsed.data.compareTo,
  });

  return NextResponse.json({ ok: true, draft }, { status: 201 });
}

