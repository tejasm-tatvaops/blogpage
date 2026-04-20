import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminApiAccess } from "@/lib/adminAuth";
import { adminApiLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { buildIngestionEnrichmentAppendix, getIngestionJob, markIngestionJobPublished } from "@/lib/ingestionService";
import { createPost } from "@/lib/blogService";
import { createForumPost } from "@/lib/forumService";
import { createTutorial } from "@/lib/tutorialService";
import { getSystemToggles } from "@/lib/systemToggles";
import { recordMetric } from "@/lib/observability";
import type { IngestionOutputType } from "@/models/ContentIngestionJob";

const resolveOutputType = (job: Record<string, unknown>): IngestionOutputType | null => {
  const draftType = String(job.draft_type ?? "").trim();
  const outputType = String(job.output_type ?? "").trim();
  const publishTarget = String(job.publish_target ?? "").trim();
  const valid = new Set<IngestionOutputType>(["blog", "forum", "short_caption", "tutorial"]);
  if (valid.has(draftType as IngestionOutputType)) return draftType as IngestionOutputType;
  if (valid.has(outputType as IngestionOutputType)) return outputType as IngestionOutputType;
  if (publishTarget === "tutorials") return "tutorial";
  if (publishTarget === "forum") return "forum";
  if (publishTarget === "shorts") return "short_caption";
  if (publishTarget === "blog") return "blog";
  return null;
};

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
  const excerpt = (job.edited_excerpt as string | null) ?? (job.ai_excerpt  as string | null) ?? "";
  const tags    = ((job.edited_tags as string[] | null)?.length ? (job.edited_tags as string[]) : ((job.ai_tags as string[] | null) ?? []));
  const category = (job.ai_category as string | null) ?? "General";
  const coverImage = (job.cover_image as string | null) ?? null;
  const outputType = resolveOutputType(job as unknown as Record<string, unknown>);
  if (!outputType) {
    return NextResponse.json(
      { error: "Job output type is invalid. Cannot publish safely." },
      { status: 409 },
    );
  }
  const toggles = getSystemToggles();
  const quizBlocks = Array.isArray(job.ai_quiz_items)
    ? (job.ai_quiz_items as unknown as Array<Record<string, unknown>>)
        .map((item, idx) => {
          const question = String(item.question ?? "").trim();
          const options = Array.isArray(item.options)
            ? (item.options as unknown[]).map((opt) => String(opt).trim()).filter(Boolean).slice(0, 6)
            : [];
          return {
            blockId: `quiz-${idx + 1}`,
            type: "quiz" as const,
            title: `Quiz ${idx + 1}`,
            prompt: question,
            options,
            answerIndex: Number(item.answer_index ?? 0),
            explanation:
              String(item.explanation ?? "").trim() ||
              "Review the tutorial section above and compare each option to the core concept.",
          };
        })
        .filter((item) => item.prompt.length > 0 && item.options.length >= 2)
        .slice(0, 6)
    : [];
  const enrichmentAppendix = toggles.ingestionEnrichmentAppendixEnabled
    ? buildIngestionEnrichmentAppendix(job as unknown as Record<string, unknown>)
    : "";
  const enrichedContent =
    enrichmentAppendix && !content.includes("## FAQs")
      ? `${content.trim()}\n\n${enrichmentAppendix}`.trim()
      : content;

  let publishedSlug: string;
  let publishedType: string;

  if (outputType === "forum") {
    const post = await createForumPost({
      title,
      content: toggles.ingestionEnrichmentAppendixEnabled ? enrichedContent : content,
      tags,
      author_name: "TatvaOps AI",
    });
    publishedSlug = post.slug;
    publishedType = "forum";
  } else if (outputType === "tutorial") {
    const tutorial = await createTutorial({
      title,
      excerpt: excerpt || "Generated tutorial draft from ingestion pipeline.",
      content,
      author: "TatvaOps AI",
      difficulty: ((job.edited_difficulty as "beginner" | "intermediate" | "advanced" | null) ?? "beginner"),
      contentType: "article",
      tags,
      category,
      coverImage,
      learningPathId: (job.edited_learning_path_id as string | null) ?? null,
      interactiveBlocks:
        toggles.autoGeneratedQuizzesEnabled && !(job.ai_quiz_requires_review as boolean | undefined)
          ? quizBlocks
          : [],
      published: true,
    });
    publishedSlug = (tutorial as unknown as { slug: string }).slug;
    publishedType = "tutorial";
  } else {
    // blog, short_caption
    const blog = await createPost({
      title,
      content: outputType === "short_caption" ? content : (toggles.ingestionEnrichmentAppendixEnabled ? enrichedContent : content),
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
  recordMetric("ingest.publish_success", {
    job_id: jobId,
    published_type: publishedType,
    output_type: outputType,
    enrichment_enabled: toggles.ingestionEnrichmentAppendixEnabled,
    auto_quiz_enabled: toggles.autoGeneratedQuizzesEnabled,
    quiz_blocks_created:
      toggles.autoGeneratedQuizzesEnabled && !(job.ai_quiz_requires_review as boolean | undefined)
        ? quizBlocks.length
        : 0,
    quiz_requires_review: Boolean(job.ai_quiz_requires_review),
  });

  if (publishedType === "tutorial") {
    revalidatePath("/tutorials");
    revalidatePath(`/tutorials/${publishedSlug}`);
  }

  return NextResponse.json({ ok: true, published_slug: publishedSlug, type: publishedType });
}
