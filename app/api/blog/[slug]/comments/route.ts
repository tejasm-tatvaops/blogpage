import { NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blogService";
import { addComment, commentInputSchema, getComments } from "@/lib/commentService";
import { commentLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const post = await getPostBySlug(decodeURIComponent(slug));
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    const comments = await getComments(post.id);
    return NextResponse.json({ comments }, { status: 200 });
  } catch (error) {
    logger.error({ error }, "GET /api/blog/[slug]/comments error");
    return NextResponse.json({ error: "Failed to fetch comments." }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const ip = getRateLimitKey(request);
  const rl = commentLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const { slug } = await params;
    const post = await getPostBySlug(decodeURIComponent(slug));
    if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });

    let body: unknown;
    try {
      body = (await request.json()) as unknown;
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }
    const result = commentInputSchema.safeParse(body);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Invalid input.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const comment = await addComment(post.id, result.data);
    logger.info({ postId: post.id, slug }, "New comment added");
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    logger.error({ error }, "POST /api/blog/[slug]/comments error");
    return NextResponse.json({ error: "Failed to post comment." }, { status: 500 });
  }
}
