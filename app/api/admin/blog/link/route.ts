import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { autoLinkContent } from "@/lib/internalLinker";
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
  let currentSlug: string | undefined;

  try {
    const body = (await req.json()) as { content?: unknown; currentSlug?: unknown };
    content = String(body.content ?? "").trim();
    currentSlug = body.currentSlug ? String(body.currentSlug) : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!content || content.length < 50) {
    return NextResponse.json(
      { error: "content must be at least 50 characters." },
      { status: 400 },
    );
  }

  try {
    const result = await autoLinkContent(content, currentSlug);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[auto-link]", err);
    return NextResponse.json({ error: "Internal linking failed." }, { status: 500 });
  }
}
