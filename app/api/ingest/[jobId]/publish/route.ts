import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { getIngestionJob, markIngestionJobPublished } from "@/lib/ingestionService";
import { createPost } from "@/lib/blogService";
import { createForumPost } from "@/lib/forumService";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const authorized = await requireAdminApiAccess();
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = adminApiLimiter(getRateLimitKey(request));
  if (!rl.allowed) return rateLimitResponse(rl);

  const { jobId } = await params;
  const job = await getIngestionJob(jobId);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if ((job.status as string) !== "ready") {
    return NextResponse.json({ error: "Job is not ready for publishing." }, { status: 409 });
  }

  const title   = (job.edited_title   as string | null) ?? (job.ai_title   as string | null) ?? "Untitled";
  const content = (job.edited_content as string | null) ?? (job.ai_content as string | null) ?? "";
  const excerpt = (job.ai_excerpt  as string | null) ?? "";
  const tags    = (job.ai_tags     as string[] | null) ?? [];
  const category = (job.ai_category as string | null) ?? "General";
  const outputType = (job.output_type as string | undefined) ?? "blog";

  let publishedSlug: string;
  let publishedType: string;

  if (outputType === "forum") {
    const post = await createForumPost({
      title,
      content,
      tags,
      author_name: "TatvaOps AI",
    });
    publishedSlug = post.slug;
    publishedType = "forum";
  } else {
    // blog, tutorial (stored as blog), short_caption
    const blog = await createPost({
      title,
      content: outputType === "short_caption" ? content : content,
      excerpt,
      tags,
      category,
      author: "TatvaOps AI",
      published: false, // admin publishes manually after review
    });
    publishedSlug = (blog as unknown as { slug: string }).slug;
    publishedType = "blog";
  }

  await markIngestionJobPublished(jobId, publishedSlug, publishedType);

  return NextResponse.json({ ok: true, published_slug: publishedSlug, type: publishedType });
}
