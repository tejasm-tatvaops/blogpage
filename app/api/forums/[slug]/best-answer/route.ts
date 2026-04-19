import { NextResponse } from "next/server";
import { setBestAnswer } from "@/lib/forumService";
import { getFingerprintFromRequest } from "@/lib/fingerprint";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { onBestAnswerAwarded } from "@/lib/reputationEngine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = getRateLimitKey(request);
  const rl = adminApiLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  const fingerprintId = getFingerprintFromRequest(request);
  if (!fingerprintId) {
    return NextResponse.json({ error: "Identity not established." }, { status: 401 });
  }

  let body: { comment_id?: unknown } = {};
  try {
    body = (await request.json()) as { comment_id?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const commentId = body.comment_id;
  if (typeof commentId !== "string" || !commentId.trim()) {
    return NextResponse.json({ error: "comment_id is required." }, { status: 400 });
  }

  try {
    const { slug } = await params;
    const result = await setBestAnswer(
      decodeURIComponent(slug),
      commentId.trim(),
      fingerprintId,
    );

    if (!result.ok) {
      const status = result.reason === "unauthorized" ? 403 : 404;
      return NextResponse.json({ error: result.reason ?? "Failed." }, { status });
    }

    // Award reputation to the comment author. result.comment_author_key should
    // be the identity_key stored on the comment; fall back to a best-effort fp.
    const authorKey = (result as Record<string, unknown>).comment_author_key as string | undefined;
    if (authorKey) {
      void onBestAnswerAwarded(authorKey, decodeURIComponent(slug));
    }

    logger.info({ slug, commentId }, "Best answer set");
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "POST /api/forums/[slug]/best-answer error");
    return NextResponse.json({ error: "Failed to set best answer." }, { status: 500 });
  }
}
