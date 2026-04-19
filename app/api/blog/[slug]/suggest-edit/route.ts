import { NextResponse } from "next/server";
import { z } from "zod";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { proposeEdit } from "@/lib/revisionService";
import { commentLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";

const schema = z.object({
  proposed_content: z.string().trim().min(50).max(150_000),
  proposed_title:   z.string().trim().max(200).optional(),
  proposed_excerpt: z.string().trim().max(300).optional(),
  edit_summary:     z.string().trim().max(300).optional(),
  display_name:     z.string().trim().min(1).max(120),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = getRateLimitKey(request);
  const rl = commentLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const fp = getFingerprintFromRequest(request);
  const identityKey = fp ? `fp:${fp}` : `ip:${ip}`;

  const { slug } = await params;
  const result = await proposeEdit({
    blogSlug: decodeURIComponent(slug),
    proposerIdentityKey: identityKey,
    proposerDisplayName: parsed.data.display_name,
    proposedContent: parsed.data.proposed_content,
    proposedTitle:   parsed.data.proposed_title ?? null,
    proposedExcerpt: parsed.data.proposed_excerpt ?? null,
    editSummary:     parsed.data.edit_summary ?? null,
  });

  if (!result.ok) {
    const status = result.reason === "blog_not_found" ? 404 : 409;
    return NextResponse.json({ error: result.reason }, { status });
  }

  return NextResponse.json({ revision_id: result.revisionId }, { status: 201 });
}
