import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { detectDuplicates, WARN_THRESHOLD } from "@/lib/duplicateDetector";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = getRateLimitKey(req);
  const rl = adminApiLimiter(key);
  if (!rl.allowed) return rateLimitResponse(rl);

  let content = "";
  let excludeSlug: string | undefined;

  try {
    const body = (await req.json()) as { content?: unknown; excludeSlug?: unknown };
    content = String(body.content ?? "").trim();
    excludeSlug = body.excludeSlug ? String(body.excludeSlug) : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!content || content.length < 100) {
    return NextResponse.json(
      { error: "content must be at least 100 characters." },
      { status: 400 },
    );
  }

  try {
    const similar = await detectDuplicates(content, excludeSlug, 5);
    const hasDuplicate = similar.some((s) => s.score >= WARN_THRESHOLD);
    return NextResponse.json({ similar, hasDuplicate, threshold: WARN_THRESHOLD });
  } catch (err) {
    console.error("[check-duplicate]", err);
    return NextResponse.json({ error: "Duplicate check failed." }, { status: 500 });
  }
}
