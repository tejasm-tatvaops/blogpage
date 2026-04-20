/**
 * Ingestion Service — AI pipeline for document/URL → content generation.
 *
 * Supported sources:
 *   url   — fetches page text, strips HTML, feeds to AI
 *   pdf   — receives pre-extracted text (extraction done client-side or via route)
 *   doc   — same as pdf (pre-extracted)
 *   paste — raw text passed directly
 *
 * Output types: blog draft, forum thread starter, short caption, tutorial draft.
 *
 * AI call reuses the same OpenAI/Groq client already wired in aiBlogGenerator.ts
 * to avoid adding new dependencies.
 */

import { connectToDatabase } from "@/lib/mongodb";
import { ContentIngestionJobModel, type IngestionOutputType, type IngestionSourceType } from "@/models/ContentIngestionJob";
import { logger } from "@/lib/logger";

const toPublishTarget = (outputType: IngestionOutputType): "blog" | "forum" | "shorts" | "tutorials" => {
  if (outputType === "forum") return "forum";
  if (outputType === "short_caption") return "shorts";
  if (outputType === "tutorial") return "tutorials";
  return "blog";
};

// ─── Text extraction helpers ──────────────────────────────────────────────────

/** Fetch a URL and strip all HTML tags to get readable text (≤ 20k chars). */
async function extractTextFromUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "TatvaOps-Ingestion-Bot/1.0" },
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // Strip HTML tags and collapse whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 20_000);

    return text;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ─── AI generation ────────────────────────────────────────────────────────────

async function generateDraftFromText(
  sourceText: string,
  outputType: IngestionOutputType,
): Promise<{
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  category: string;
  summary: string;
  insights: string[];
}> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.GROQ_API_KEY;
  const isGroq  = !process.env.OPENAI_API_KEY && !!process.env.GROQ_API_KEY;

  if (!apiKey) throw new Error("No AI API key configured.");

  const endpoint = isGroq
    ? "https://api.groq.com/openai/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";

  const model = isGroq ? "llama-3.1-70b-versatile" : "gpt-4o-mini";

  const outputInstructions: Record<IngestionOutputType, string> = {
    blog: `Write a detailed blog post (600-1000 words) in Markdown. Include headings (##), paragraphs, and a conclusion.`,
    forum: `Write a concise forum discussion starter (150-300 words). Focus on a key question or debate point from the source.`,
    short_caption: `Write a punchy 2-3 sentence short-video caption summarizing the key insight. Max 80 words.`,
    tutorial: `Write a step-by-step tutorial article in Markdown (500-800 words). Use numbered lists for steps.`,
  };

  const prompt = `You are a professional content writer for TatvaOps, a construction technology platform.

SOURCE TEXT (extracted from document/URL):
---
${sourceText.slice(0, 8_000)}
---

TASK: ${outputInstructions[outputType]}

Also provide:
- A short, SEO-optimized title (max 100 chars)
- An excerpt / meta description (max 150 chars)
- 3-5 relevant tags as a JSON array (lowercase, hyphenated)
- One category (e.g., "Construction Tech", "Project Management", "Estimation")
- A 2-3 sentence summary of the source
- 3-5 bullet-point key insights from the source as a JSON array of strings

Respond ONLY with valid JSON in this exact shape:
{
  "title": "...",
  "excerpt": "...",
  "content": "...",
  "tags": ["...", "..."],
  "category": "...",
  "summary": "...",
  "insights": ["...", "...", "..."]
}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.65,
      max_tokens: 2_500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  return {
    title:    String(parsed.title    ?? "Untitled"),
    excerpt:  String(parsed.excerpt  ?? ""),
    content:  String(parsed.content  ?? ""),
    tags:     Array.isArray(parsed.tags) ? (parsed.tags as string[]).slice(0, 8) : [],
    category: String(parsed.category ?? "General"),
    summary:  String(parsed.summary  ?? ""),
    insights: Array.isArray(parsed.insights) ? (parsed.insights as string[]).slice(0, 8) : [],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type CreateIngestionJobInput = {
  initiatorIdentityKey: string;
  sourceType: IngestionSourceType;
  sourceUrl?: string | null;
  sourceText?: string | null;
  sourceFilename?: string | null;
  outputType?: IngestionOutputType;
};

/** Create and immediately process an ingestion job. Returns the job document. */
export async function createIngestionJob(input: CreateIngestionJobInput) {
  await connectToDatabase();
  const outputType = input.outputType ?? "blog";

  const job = await ContentIngestionJobModel.create({
    initiator_identity_key: input.initiatorIdentityKey,
    source_type:  input.sourceType,
    source_url:   input.sourceUrl  ?? null,
    source_text:  input.sourceText ?? null,
    source_filename: input.sourceFilename ?? null,
    output_type:  outputType,
    draft_type: outputType,
    publish_target: toPublishTarget(outputType),
    status:       "pending",
  });

  // Kick off async processing (fire-and-forget)
  void processIngestionJob(String(job._id)).catch((err) => {
    logger.error({ err, jobId: String(job._id) }, "Ingestion job failed");
  });

  return job;
}

/** Process a pending ingestion job (called internally or by admin retry). */
export async function processIngestionJob(jobId: string): Promise<void> {
  await connectToDatabase();

  await ContentIngestionJobModel.findByIdAndUpdate(jobId, {
    $set: { status: "processing", processing_started_at: new Date() },
  });

  try {
    const job = await ContentIngestionJobModel.findById(jobId).lean();
    if (!job) throw new Error("Job not found");

    const sourceType = job.source_type as IngestionSourceType;
    const outputType = (job.output_type as IngestionOutputType | undefined) ?? "blog";

    let sourceText = (job.source_text as string | null | undefined) ?? null;

    // For URL jobs, fetch and extract text now
    if (sourceType === "url" && job.source_url) {
      sourceText = await extractTextFromUrl(job.source_url as string);
      await ContentIngestionJobModel.findByIdAndUpdate(jobId, {
        $set: { source_text: sourceText },
      });
    }

    if (!sourceText || sourceText.trim().length < 50) {
      throw new Error("Insufficient source text to generate content.");
    }

    const draft = await generateDraftFromText(sourceText, outputType);

    await ContentIngestionJobModel.findByIdAndUpdate(jobId, {
      $set: {
        status: "ready",
        draft_type: outputType,
        publish_target: toPublishTarget(outputType),
        ai_title:    draft.title,
        ai_excerpt:  draft.excerpt,
        ai_content:  draft.content,
        ai_tags:     draft.tags,
        ai_category: draft.category,
        ai_summary:  draft.summary,
        ai_insights: draft.insights,
        processing_finished_at: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ContentIngestionJobModel.findByIdAndUpdate(jobId, {
      $set: {
        status: "failed",
        error_message: message.slice(0, 500),
        processing_finished_at: new Date(),
      },
    });
    throw err;
  }
}

export async function getIngestionJob(jobId: string) {
  await connectToDatabase();
  return ContentIngestionJobModel.findById(jobId).lean();
}

export async function listIngestionJobs(initiatorKey: string, limit = 20) {
  await connectToDatabase();
  return ContentIngestionJobModel.find({ initiator_identity_key: initiatorKey })
    .sort({ created_at: -1 })
    .limit(limit)
    .select("-source_text -ai_content") // omit large blobs for list view
    .lean();
}

/** Save user edits to the AI draft before publishing. */
export async function updateIngestionJobDraft(
  jobId: string,
  edits: {
    title?: string;
    excerpt?: string;
    content?: string;
    tags?: string[];
    difficulty?: "beginner" | "intermediate" | "advanced";
    learningPathId?: string | null;
  },
) {
  await connectToDatabase();
  await ContentIngestionJobModel.findByIdAndUpdate(jobId, {
    $set: {
      ...(edits.title   ? { edited_title:   edits.title }   : {}),
      ...(edits.excerpt ? { edited_excerpt: edits.excerpt } : {}),
      ...(edits.content ? { edited_content: edits.content } : {}),
      ...(edits.tags ? { edited_tags: edits.tags.slice(0, 12) } : {}),
      ...(edits.difficulty ? { edited_difficulty: edits.difficulty } : {}),
      ...(edits.learningPathId !== undefined ? { edited_learning_path_id: edits.learningPathId || null } : {}),
    },
  });
}

/** Mark a job as published and record the resulting content slug. */
export async function markIngestionJobPublished(
  jobId: string,
  publishedSlug: string,
  publishedContentType: string,
) {
  await connectToDatabase();
  await ContentIngestionJobModel.findByIdAndUpdate(jobId, {
    $set: {
      status: "published",
      published_slug: publishedSlug,
      published_content_type: publishedContentType,
      publish_target:
        publishedContentType === "tutorial"
          ? "tutorials"
          : publishedContentType === "forum"
            ? "forum"
            : publishedContentType === "short_caption"
              ? "shorts"
              : "blog",
    },
  });
}
