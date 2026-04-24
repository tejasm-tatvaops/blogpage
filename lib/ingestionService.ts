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

import { connectToDatabase } from "@/lib/db/mongodb";
import {
  ContentIngestionJobModel,
  type IngestionOutputType,
  type IngestionSourceSubtype,
  type IngestionSourceType,
} from "@/models/ContentIngestionJob";
import { logger } from "@/lib/logger";
import { resolveBlogCoverImage } from "@/lib/imageService";
import { recordMetric } from "@/lib/observability";

const toPublishTarget = (outputType: IngestionOutputType): "blog" | "forum" | "shorts" | "tutorials" => {
  if (outputType === "forum") return "forum";
  if (outputType === "short_caption") return "shorts";
  if (outputType === "tutorial") return "tutorials";
  return "blog";
};

// ─── Image helpers ────────────────────────────────────────────────────────────

type ExtractedImage = { src: string; alt: string };
type FaqItem = { question: string; answer: string };
type GlossaryItem = { term: string; definition: string };
type QuizItem = { question: string; options: string[]; answer_index: number; explanation: string };

const inferSourceSubtype = (sourceUrl?: string | null): IngestionSourceSubtype => {
  if (!sourceUrl) return "generic_webpage";
  try {
    const url = new URL(sourceUrl);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube_video";
    if (host.includes("github.com")) return "github_repository";
    if (
      host.includes("arxiv.org") ||
      host.includes("doi.org") ||
      host.includes("researchgate.net") ||
      host.includes("acm.org") ||
      host.includes("ieee.org")
    ) {
      return "research_paper";
    }
  } catch {
    // no-op
  }
  return "generic_webpage";
};

/** Allow only http/https URLs under 2048 chars; reject data URIs and other schemes. */
function sanitizeImageUrl(raw: string): string | null {
  if (!raw || raw.length > 2048) return null;
  try {
    const { protocol } = new URL(raw);
    if (protocol !== "http:" && protocol !== "https:") return null;
    return raw;
  } catch {
    return null;
  }
}

/** Extract unique <img> src/alt pairs from raw HTML (max 20 images). */
function extractImagesFromHtml(html: string): ExtractedImage[] {
  const seen = new Set<string>();
  const images: ExtractedImage[] = [];
  const imgRe = /<img\b[^>]*>/gi;
  const srcRe = /\bsrc=["']([^"']+)["']/i;
  const altRe = /\balt=["']([^"']*)["']/i;

  let match: RegExpExecArray | null;
  while ((match = imgRe.exec(html)) !== null && images.length < 20) {
    const tag = match[0];
    const srcMatch = srcRe.exec(tag);
    if (!srcMatch) continue;
    const src = sanitizeImageUrl(srcMatch[1].trim());
    if (!src || seen.has(src)) continue;
    seen.add(src);
    const altMatch = altRe.exec(tag);
    images.push({ src, alt: altMatch ? altMatch[1].trim() : "" });
  }

  return images;
}

async function validateImageReachability(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const headRes = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    if (headRes.ok) return true;
  } catch {
    // ignore and fallback to GET probe
  } finally {
    clearTimeout(timeout);
  }

  const getController = new AbortController();
  const getTimeout = setTimeout(() => getController.abort(), 5_000);
  try {
    const getRes = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: getController.signal,
    });
    return getRes.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(getTimeout);
  }
}

async function filterReachableImages(images: ExtractedImage[], maxProbe = 5): Promise<ExtractedImage[]> {
  if (images.length === 0) return [];
  const kept: ExtractedImage[] = [];
  const probe = images.slice(0, maxProbe);
  for (const image of probe) {
    // Validate first N images only to avoid large ingestion latency.
    if (await validateImageReachability(image.src)) {
      kept.push(image);
    }
  }
  if (kept.length > 0) return kept.concat(images.slice(maxProbe));
  return images.slice(0, 1);
}

const isLowValueText = (value: string): boolean => {
  const v = value.trim().toLowerCase();
  if (!v) return true;
  return (
    v === "n/a" ||
    v === "na" ||
    v === "none" ||
    v === "unknown" ||
    v === "not applicable" ||
    v.length < 8
  );
};

function dedupeStrings(values: string[], max: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (isLowValueText(value)) continue;
    const key = value.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= max) break;
  }
  return result;
}

function qualityFilterFaqs(faqs: FaqItem[], max = 6): FaqItem[] {
  const seen = new Set<string>();
  const result: FaqItem[] = [];
  for (const faq of faqs) {
    if (isLowValueText(faq.question) || isLowValueText(faq.answer)) continue;
    const key = `${faq.question}`.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      question: faq.question.trim(),
      answer: faq.answer.trim(),
    });
    if (result.length >= max) break;
  }
  return result;
}

function estimateJsonBytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return 0;
  }
}

function estimateQuizConfidence(quizItems: QuizItem[]): number {
  if (quizItems.length === 0) return 0;
  const perItem = quizItems.map((item) => {
    const hasEnoughOptions = item.options.length >= 4 ? 1 : item.options.length >= 3 ? 0.75 : 0.4;
    const hasExplanation = item.explanation.trim().length >= 40 ? 1 : item.explanation.trim().length >= 20 ? 0.7 : 0.3;
    const promptQuality = item.question.length >= 24 ? 1 : item.question.length >= 12 ? 0.7 : 0.3;
    const uniqueOptions = new Set(item.options.map((v) => v.toLowerCase().trim())).size;
    const optionDiversity = uniqueOptions >= item.options.length ? 1 : 0.6;
    return (hasEnoughOptions * 0.3) + (hasExplanation * 0.3) + (promptQuality * 0.2) + (optionDiversity * 0.2);
  });
  const avg = perItem.reduce((a, b) => a + b, 0) / perItem.length;
  return Math.max(0, Math.min(1, Number(avg.toFixed(3))));
}

// ─── Text extraction helpers ──────────────────────────────────────────────────

/** Fetch a URL, extract images, and strip HTML tags to get readable text (≤ 20k chars). */
async function extractFromUrl(url: string): Promise<{ text: string; images: ExtractedImage[] }> {
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

    // Extract images before stripping tags
    const images = extractImagesFromHtml(html);

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

    return { text, images };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ─── AI generation ────────────────────────────────────────────────────────────

async function generateDraftFromText(
  sourceText: string,
  outputType: IngestionOutputType,
  sourceSubtype: IngestionSourceSubtype,
): Promise<{
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  category: string;
  summary: string;
  insights: string[];
  faqs: FaqItem[];
  glossaryTerms: GlossaryItem[];
  quizItems: QuizItem[];
  keyTakeaways: string[];
  prerequisiteLinks: string[];
  relatedForumTopics: string[];
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

  const subtypeInstruction: Record<IngestionSourceSubtype, string> = {
    generic_webpage: "Treat this as a standard article/webpage source and preserve practical details.",
    youtube_video: "Treat this as a YouTube/video transcript source and structure output into teachable steps.",
    github_repository: "Treat this as a GitHub repository/code source and explain setup, architecture, and practical usage.",
    research_paper: "Treat this as a research source and simplify complex concepts into practitioner-friendly explanations.",
  };

  const prompt = `You are a professional content writer for TatvaOps, a construction technology platform.

SOURCE TEXT (extracted from document/URL):
---
${sourceText.slice(0, 8_000)}
---

TASK: ${outputInstructions[outputType]}
SOURCE MODE: ${subtypeInstruction[sourceSubtype]}

Also provide:
- A short, SEO-optimized title (max 100 chars)
- An excerpt / meta description (max 150 chars)
- 3-5 relevant tags as a JSON array (lowercase, hyphenated)
- One category (e.g., "Construction Tech", "Project Management", "Estimation")
- A 2-3 sentence summary of the source
- 3-5 bullet-point key insights from the source as a JSON array of strings
- 3-6 FAQ pairs as JSON array: [{ "question": "...?", "answer": "..." }]
- 4-10 glossary terms as JSON array: [{ "term": "...", "definition": "..." }]
- 3-5 quiz items as JSON array with shape:
  { "question": "...", "options": ["...", "...", "...", "..."], "answer_index": 0, "explanation": "..." }
- 4-8 key takeaways as JSON array of strings
- 2-6 prerequisite links as JSON array of strings (use relative platform-style paths like /blog/... or /tutorials/... when possible)
- 3-6 related forum discussion topics as JSON array of short strings

Respond ONLY with valid JSON in this exact shape:
{
  "title": "...",
  "excerpt": "...",
  "content": "...",
  "tags": ["...", "..."],
  "category": "...",
  "summary": "...",
  "insights": ["...", "...", "..."],
  "faqs": [{ "question": "...?", "answer": "..." }],
  "glossary_terms": [{ "term": "...", "definition": "..." }],
  "quiz_items": [{ "question": "...", "options": ["...", "..."], "answer_index": 0, "explanation": "..." }],
  "key_takeaways": ["...", "..."],
  "prerequisite_links": ["/tutorials/..."],
  "related_forum_topics": ["..."]
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
    faqs: qualityFilterFaqs(
      Array.isArray(parsed.faqs)
      ? (parsed.faqs as Array<Record<string, unknown>>)
          .map((item) => ({
            question: String(item.question ?? "").trim().slice(0, 240),
            answer: String(item.answer ?? "").trim().slice(0, 1200),
          }))
          .filter((item) => item.question && item.answer)
      : [],
      6,
    ),
    glossaryTerms: Array.isArray(parsed.glossary_terms)
      ? (parsed.glossary_terms as Array<Record<string, unknown>>)
          .map((item) => ({
            term: String(item.term ?? "").trim().slice(0, 120),
            definition: String(item.definition ?? "").trim().slice(0, 500),
          }))
          .filter((item) => item.term && item.definition)
          .filter((item) => !isLowValueText(item.term) && !isLowValueText(item.definition))
          .slice(0, 10)
      : [],
    quizItems: Array.isArray(parsed.quiz_items)
      ? (parsed.quiz_items as Array<Record<string, unknown>>)
          .map((item) => {
            const options = Array.isArray(item.options)
              ? (item.options as unknown[]).map((v) => String(v).trim()).filter(Boolean).slice(0, 6)
              : [];
            return {
              question: String(item.question ?? "").trim().slice(0, 240),
              options,
              answer_index: Math.max(0, Math.min(options.length - 1, Number(item.answer_index ?? 0))),
              explanation: String(item.explanation ?? "").trim().slice(0, 1000),
            };
          })
          .filter((item) => item.question && item.options.length >= 2 && !isLowValueText(item.question))
          .slice(0, 6)
      : [],
    keyTakeaways: Array.isArray(parsed.key_takeaways)
      ? dedupeStrings((parsed.key_takeaways as string[]).map((v) => String(v).trim()), 8)
      : [],
    prerequisiteLinks: Array.isArray(parsed.prerequisite_links)
      ? dedupeStrings((parsed.prerequisite_links as string[]).map((v) => String(v).trim()), 6)
      : [],
    relatedForumTopics: Array.isArray(parsed.related_forum_topics)
      ? dedupeStrings((parsed.related_forum_topics as string[]).map((v) => String(v).trim()), 6)
      : [],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type CreateIngestionJobInput = {
  initiatorIdentityKey: string;
  sourceType: IngestionSourceType;
  sourceSubtype?: IngestionSourceSubtype;
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
    source_subtype:
      input.sourceSubtype ??
      (input.sourceType === "research_paper"
        ? "research_paper"
        : input.sourceType === "youtube"
          ? "youtube_video"
          : input.sourceType === "github_repo"
            ? "github_repository"
            : inferSourceSubtype(input.sourceUrl)),
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
    const sourceSubtype = (job.source_subtype as IngestionSourceSubtype | undefined) ?? inferSourceSubtype(job.source_url as string | null | undefined);

    let sourceText = (job.source_text as string | null | undefined) ?? null;

    // For URL jobs, fetch and extract text + images now
    if ((sourceType === "url" || sourceType === "youtube" || sourceType === "github_repo" || sourceType === "research_paper") && job.source_url) {
      const { text, images } = await extractFromUrl(job.source_url as string);
      const reachableImages = await filterReachableImages(images);
      sourceText = text;
      await ContentIngestionJobModel.findByIdAndUpdate(jobId, {
        $set: {
          source_text: sourceText,
          extracted_images: reachableImages,
          // Pre-populate cover_image with first extracted image if not already set
          ...(reachableImages.length > 0 && !job.cover_image ? { cover_image: reachableImages[0].src } : {}),
        },
      });
      recordMetric("ingest.image_extraction", {
        job_id: jobId,
        extracted_count: images.length,
        reachable_count: reachableImages.length,
      });
    }

    if (!sourceText || sourceText.trim().length < 50) {
      throw new Error("Insufficient source text to generate content.");
    }

    const draft = await generateDraftFromText(sourceText, outputType, sourceSubtype);
    const enrichmentPayload = {
      faqs: draft.faqs,
      glossary: draft.glossaryTerms,
      quiz: draft.quizItems,
      key_takeaways: draft.keyTakeaways,
      prerequisites: draft.prerequisiteLinks,
      related_topics: draft.relatedForumTopics,
    };
    const enrichmentBytes = estimateJsonBytes(enrichmentPayload);
    if (enrichmentBytes > 220_000) {
      // Defensive cap against oversized ingestion docs on pathological model output.
      draft.faqs = draft.faqs.slice(0, 3);
      draft.glossaryTerms = draft.glossaryTerms.slice(0, 5);
      draft.quizItems = draft.quizItems.slice(0, 3);
      draft.keyTakeaways = draft.keyTakeaways.slice(0, 5);
      draft.prerequisiteLinks = draft.prerequisiteLinks.slice(0, 4);
      draft.relatedForumTopics = draft.relatedForumTopics.slice(0, 4);
    }
    const generatedCoverImage =
      !job.cover_image && draft.title
        ? await resolveBlogCoverImage({
            title: draft.title,
            category: draft.category,
            tags: draft.tags,
            existingCoverImage: null,
          }).catch(() => null)
        : null;
    const quizConfidence = estimateQuizConfidence(draft.quizItems);
    const quizRequiresReview = draft.quizItems.length > 0 && quizConfidence < 0.72;

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
        ai_faqs: draft.faqs,
        ai_glossary_terms: draft.glossaryTerms,
        ai_quiz_items: draft.quizItems,
        ai_quiz_confidence_score: quizConfidence,
        ai_quiz_requires_review: quizRequiresReview,
        ai_key_takeaways: draft.keyTakeaways,
        ai_prerequisite_links: draft.prerequisiteLinks,
        ai_related_forum_topics: draft.relatedForumTopics,
        ...(generatedCoverImage && !job.cover_image ? { cover_image: generatedCoverImage } : {}),
        processing_finished_at: new Date(),
      },
    });
    recordMetric("ingest.job_success", {
      job_id: jobId,
      source_type: sourceType,
      source_subtype: sourceSubtype,
      output_type: outputType,
      quiz_count: draft.quizItems.length,
      quiz_confidence: quizConfidence,
      quiz_requires_review: quizRequiresReview,
      faq_count: draft.faqs.length,
      glossary_count: draft.glossaryTerms.length,
      enrichment_bytes: enrichmentBytes,
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
    recordMetric("ingest.job_failed", {
      job_id: jobId,
      error: message.slice(0, 120),
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
    coverImage?: string | null;
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
      ...(edits.coverImage !== undefined ? { cover_image: sanitizeImageUrl(edits.coverImage ?? "") ?? null } : {}),
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

export function buildIngestionEnrichmentAppendix(job: Record<string, unknown>): string {
  const faqs = Array.isArray(job.ai_faqs)
    ? (job.ai_faqs as Array<Record<string, unknown>>)
        .map((item) => ({
          question: String(item.question ?? "").trim(),
          answer: String(item.answer ?? "").trim(),
        }))
        .filter((item) => item.question && item.answer)
        .slice(0, 6)
    : [];
  const glossary = Array.isArray(job.ai_glossary_terms)
    ? (job.ai_glossary_terms as Array<Record<string, unknown>>)
        .map((item) => ({
          term: String(item.term ?? "").trim(),
          definition: String(item.definition ?? "").trim(),
        }))
        .filter((item) => item.term && item.definition)
        .slice(0, 8)
    : [];
  const takeaways = Array.isArray(job.ai_key_takeaways)
    ? (job.ai_key_takeaways as string[]).map((v) => String(v).trim()).filter(Boolean).slice(0, 8)
    : [];
  const prerequisites = Array.isArray(job.ai_prerequisite_links)
    ? (job.ai_prerequisite_links as string[]).map((v) => String(v).trim()).filter(Boolean).slice(0, 6)
    : [];
  const forumTopics = Array.isArray(job.ai_related_forum_topics)
    ? (job.ai_related_forum_topics as string[]).map((v) => String(v).trim()).filter(Boolean).slice(0, 6)
    : [];

  const lines: string[] = [];
  if (takeaways.length > 0) {
    lines.push("## Key Takeaways");
    for (const item of takeaways) lines.push(`- ${item}`);
    lines.push("");
  }
  if (prerequisites.length > 0) {
    lines.push("## Prerequisites");
    for (const item of prerequisites) lines.push(`- ${item}`);
    lines.push("");
  }
  if (glossary.length > 0) {
    lines.push("## Glossary");
    for (const item of glossary) lines.push(`- **${item.term}**: ${item.definition}`);
    lines.push("");
  }
  if (forumTopics.length > 0) {
    lines.push("## Related Forum Discussions");
    for (const topic of forumTopics) lines.push(`- ${topic}`);
    lines.push("");
  }
  if (faqs.length > 0) {
    lines.push("## FAQs");
    for (const faq of faqs) {
      lines.push(`### ${faq.question}`);
      lines.push(faq.answer);
      lines.push("");
    }
  }
  return lines.join("\n").trim();
}
