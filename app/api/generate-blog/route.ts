import { NextResponse } from "next/server";
import { generateBlogFromKeyword } from "@/lib/aiBlogGenerator";
import { readJsonBody } from "@/lib/adminApi";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { generateBlogLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getRateLimitKey(request);
  const rl = generateBlogLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body = await readJsonBody<{ keyword?: string; internalLinks?: string[] }>(request);

    const keyword = body.keyword?.trim() ?? "";
    if (!keyword) {
      return NextResponse.json({ error: "Keyword is required." }, { status: 400 });
    }
    if (keyword.length > 200) {
      return NextResponse.json({ error: "Keyword too long (max 200 characters)." }, { status: 400 });
    }

    const internalLinks = Array.isArray(body.internalLinks)
      ? body.internalLinks
          .map((link) => String(link).trim())
          .filter((link) => link.startsWith("/"))
          .slice(0, 8)
      : [];

    logger.info({ keyword }, "Generating single blog post");
    const generated = await generateBlogFromKeyword(keyword, internalLinks);
    return NextResponse.json(generated, { status: 200 });
  } catch (error) {
    logger.error({ error }, "generate-blog route error");
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate blog content." },
      { status: 500 },
    );
  }
}
