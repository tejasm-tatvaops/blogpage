import { NextResponse } from "next/server";
import { z } from "zod";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { rejectRevision } from "@/lib/revisionService";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";

const schema = z.object({
  display_name:  z.string().trim().min(1).max(120),
  reviewer_note: z.string().trim().max(500).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string; revisionId: string }> },
) {
  const ip = getRateLimitKey(request);
  const rl = adminApiLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const fp = getFingerprintFromRequest(request);
  const identityKey = fp ? `fp:${fp}` : `ip:${ip}`;

  const { revisionId } = await params;
  const result = await rejectRevision(
    revisionId,
    identityKey,
    parsed.data.display_name,
    parsed.data.reviewer_note ?? null,
  );

  if (!result.ok) {
    const statusMap: Record<string, number> = {
      not_found: 404, not_pending: 409, unauthorized: 403, self_review: 403,
    };
    return NextResponse.json(
      { error: result.reason },
      { status: statusMap[result.reason ?? ""] ?? 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
