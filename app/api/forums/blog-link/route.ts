import { NextResponse } from "next/server";
import { ensureForumPostForBlog } from "@/lib/forumService";
import { forumPostLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const ip = getRateLimitKey(request);
  const rl = forumPostLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: { blog_slug?: unknown; blog_title?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const blogSlug = typeof body.blog_slug === "string" ? body.blog_slug.trim() : null;
  const blogTitle = typeof body.blog_title === "string" ? body.blog_title.trim() : null;

  if (!blogSlug || !blogTitle) {
    return NextResponse.json({ error: "blog_slug and blog_title are required." }, { status: 400 });
  }

  try {
    const forumPost = await ensureForumPostForBlog(blogSlug, blogTitle);
    logger.info({ blogSlug, forumSlug: forumPost.slug }, "Forum thread ensured for blog");
    return NextResponse.json({ forum_slug: forumPost.slug }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "POST /api/forums/blog-link error");
    return NextResponse.json({ error: "Failed to create forum thread." }, { status: 500 });
  }
}
