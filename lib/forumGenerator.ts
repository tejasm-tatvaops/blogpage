import { ForumPostModel } from "@/models/ForumPost";
import { connectToDatabase } from "@/lib/mongodb";
import { logger } from "@/lib/logger";
import { extractJsonPayload } from "@/lib/aiBlogGenerator";
import { computeHotScore, generateForumExcerpt, generateForumSlug } from "@/lib/forumService";
import { populateForums } from "@/lib/autopopulateService";

type GeneratedForumThread = {
  title: string;
  content: string;
  tags: string[];
};

type GenerateForumsResult = {
  created: number;
  skipped: number;
  failed: number;
};

const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const AI_TIMEOUT_MS = 45_000;

export const FORUM_GENERATION_PROMPT_TEMPLATE = (
  count: number,
): string => `Generate ${count} realistic construction-related forum discussion threads.

Return ONLY a JSON array:
[
  {
    "title": "string",
    "content": "string (max 3-4 lines, conversational)",
    "tags": ["string", "string"]
  }
]

Constraints:
- Content must be short forum-style discussion starters, never blog articles.
- Mix thread intent: questions, opinions, practical debates.
- Vary topics across: cost, materials, contractors, planning, location-specific issues.
- Keep each title natural, specific, and under 120 characters.
- Keep each content block under 420 characters.
- Keep tags relevant, lowercase, 2 to 5 tags per thread.`;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`AI request timed out after ${ms / 1000}s.`)), ms);
    }),
  ]);

const parseThreads = (raw: string): GeneratedForumThread[] => {
  const extracted = extractJsonPayload(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch {
    const arrayMatch = extracted.match(/\[[\s\S]*\]/);
    if (!arrayMatch) return [];
    parsed = JSON.parse(arrayMatch[0]);
  }

  let list: unknown[] = [];
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed && typeof parsed === "object") {
    const firstArray = Object.values(parsed as Record<string, unknown>).find(Array.isArray);
    if (Array.isArray(firstArray)) list = firstArray;
  }

  return list
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const title = String(item.title ?? "").trim().slice(0, 180);
      const content = String(item.content ?? "").trim().slice(0, 450);
      const tags = Array.isArray(item.tags)
        ? item.tags
            .map((t) => String(t).trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 5)
        : [];
      return { title, content, tags };
    })
    .filter((t) => t.title.length >= 8 && t.content.length >= 20);
};

const callAiForForumThreads = async (count: number): Promise<GeneratedForumThread[]> => {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const prompt = FORUM_GENERATION_PROMPT_TEMPLATE(count);

  const providers: Array<{
    name: "groq" | "openai";
    apiKey: string;
    url: string;
    model: string;
    supportsResponseFormat: boolean;
  }> = [];

  if (groqKey) {
    providers.push({
      name: "groq",
      apiKey: groqKey,
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: GROQ_MODEL,
      supportsResponseFormat: false,
    });
  }
  if (openaiKey) {
    providers.push({
      name: "openai",
      apiKey: openaiKey,
      url: "https://api.openai.com/v1/chat/completions",
      model: OPENAI_MODEL,
      supportsResponseFormat: true,
    });
  }

  if (providers.length === 0) {
    throw new Error("Neither GROQ_API_KEY nor OPENAI_API_KEY is configured.");
  }

  let lastError: Error | null = null;
  for (const provider of providers) {
    try {
      const body: Record<string, unknown> = {
        model: provider.model,
        temperature: 0.9,
        max_tokens: 1800,
        messages: [
          { role: "system", content: "Return only valid JSON array. No markdown or prose." },
          { role: "user", content: prompt },
        ],
      };
      if (provider.supportsResponseFormat) body.response_format = { type: "json_object" };

      const response = await withTimeout(
        fetch(provider.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify(body),
        }),
        AI_TIMEOUT_MS,
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`${provider.name} request failed (${response.status}): ${errorText.slice(0, 250)}`);
      }

      const completion = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = completion.choices?.[0]?.message?.content ?? "[]";
      const parsed = parseThreads(content);
      if (parsed.length === 0) throw new Error("AI returned no valid forum threads.");
      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown provider error.");
      logger.warn({ provider: provider.name, error: lastError.message }, "forum generator provider failed");
    }
  }

  throw new Error(lastError?.message ?? "All AI providers failed.");
};

const normalizeTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const generateForumThreads = async (count: number): Promise<GenerateForumsResult & { elapsedMs: number }> => {
  const t0 = performance.now();
  await connectToDatabase();
  const safeCount = Math.min(Math.max(1, Math.floor(count || 5)), 20);
  const generated = await callAiForForumThreads(safeCount);

  // Only scan recent posts for dedup — collisions with older content are rare and
  // scanning all posts would be O(n) on the entire collection.
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const existingDocs = await ForumPostModel.find({
    deleted_at: null,
    created_at: { $gte: thirtyDaysAgo },
  })
    .select("title slug")
    .limit(500)
    .lean();
  const existingSlugSet = new Set(existingDocs.map((d) => String(d.slug)));
  const existingTitleSet = new Set(existingDocs.map((d) => normalizeTitle(String(d.title))));
  const batchTitleSet = new Set<string>();

  const docsToInsert: Array<Record<string, unknown>> = [];
  let skipped = 0;

  for (const thread of generated) {
    const normalizedTitle = normalizeTitle(thread.title);
    if (!normalizedTitle) {
      skipped += 1;
      continue;
    }
    if (existingTitleSet.has(normalizedTitle) || batchTitleSet.has(normalizedTitle)) {
      skipped += 1;
      continue;
    }

    const baseSlug = generateForumSlug(thread.title) || "forum-thread";
    let slug = baseSlug;
    let attempt = 1;
    while (existingSlugSet.has(slug)) {
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }

    const createdAt = new Date();
    const upvotes = Math.floor(Math.random() * 6);
    const downvotes = 0;

    docsToInsert.push({
      title: thread.title,
      slug,
      content: thread.content,
      excerpt: generateForumExcerpt(thread.content),
      tags: thread.tags.length > 0 ? thread.tags : ["construction", "discussion"],
      author_name: "TatvaOps Community",
      upvote_count: upvotes,
      downvote_count: downvotes,
      score: computeHotScore(upvotes, downvotes, 0, createdAt),
      comment_count: 0,
      view_count: 0,
      is_featured: false,
      is_trending: false,
      best_comment_id: null,
      linked_blog_slug: null,
      creator_fingerprint: null,
      deleted_at: null,
      created_at: createdAt,
      updated_at: createdAt,
    });

    existingSlugSet.add(slug);
    existingTitleSet.add(normalizedTitle);
    batchTitleSet.add(normalizedTitle);
  }

  if (docsToInsert.length === 0) {
    return { created: 0, skipped, failed: 0, elapsedMs: Math.round(performance.now() - t0) };
  }

  let created = 0;
  let failed = 0;
  try {
    const inserted = await ForumPostModel.insertMany(docsToInsert, { ordered: false });
    created = inserted.length;
  } catch (error) {
    const err = error as { insertedDocs?: unknown[] };
    created = Array.isArray(err.insertedDocs) ? err.insertedDocs.length : 0;
    failed = Math.max(0, docsToInsert.length - created);
  }

  if (created > 0) {
    // Fire-and-forget — do not block the HTTP response waiting for AI comment generation.
    // populateForums makes sequential AI calls per post and can take 30-120s for a batch.
    void populateForums(Math.min(created, 10)).catch((error) => {
      logger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        "background autopopulate failed after forum generation",
      );
    });
  }

  const elapsedMs = Math.round(performance.now() - t0);
  logger.info({ created, skipped, failed, elapsedMs }, "forum generation complete");
  return { created, skipped, failed, elapsedMs };
};
