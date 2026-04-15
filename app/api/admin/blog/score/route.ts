import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { scoreContent } from "@/lib/contentQualityScorer";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const key = getRateLimitKey(req);
  const rl = adminApiLimiter(key);
  if (!rl.allowed) return rateLimitResponse(rl);

  let title = "";
  let excerpt = "";
  let content = "";

  try {
    const body = (await req.json()) as {
      title?: unknown;
      excerpt?: unknown;
      content?: unknown;
    };
    title = String(body.title ?? "").trim();
    excerpt = String(body.excerpt ?? "").trim();
    content = String(body.content ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!title || !content) {
    return NextResponse.json(
      { error: "title and content are required." },
      { status: 400 },
    );
  }

  try {
    const report = await scoreContent(title, excerpt, content);
    return NextResponse.json(report, { status: 200 });
  } catch (err) {
    console.error("[score]", err);
    return NextResponse.json(
      { error: "Scoring failed. Check AI API keys." },
      { status: 500 },
    );
  }
}
