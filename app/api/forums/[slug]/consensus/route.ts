import { NextResponse } from "next/server";
import { z } from "zod";
import { getForumPostBySlug } from "@/lib/forumService";
import { getComments, type Comment } from "@/lib/services/comment.service";
import { logger } from "@/lib/logger";

type RouteContext = { params: Promise<{ slug: string }> };

const AI_TIMEOUT_MS = 8_000;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const consensusSchema = z.object({
  consensusLevel: z.number().min(0).max(100),
  consensusLabel: z.string().min(3).max(80),
  agreements: z.array(z.string().min(3).max(160)).min(1).max(4),
  debate: z.object({
    question: z.string().min(6).max(160),
    sideA: z.object({
      title: z.string().min(2).max(60),
      points: z.array(z.string().min(3).max(160)).min(1).max(4),
    }),
    sideB: z.object({
      title: z.string().min(2).max(60),
      points: z.array(z.string().min(3).max(160)).min(1).max(4),
    }),
  }),
  recommendations: z.array(z.string().min(3).max(140)).min(1).max(8),
  confidence: z.enum(["High", "Medium", "Low"]),
  analyzedComments: z.number().min(0).max(500),
  analyzedInteractions: z.number().min(0).max(2_000_000),
});

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("AI request timed out")), ms)),
  ]);

const extractJson = (text: string): string => {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text.trim();
};

const memoryCache = new Map<string, { expiresAt: number; payload: unknown }>();

const DEGRADED_RETRY_AFTER_SECONDS = 90;

function flattenComments(comments: Comment[]): Comment[] {
  const result: Comment[] = [];
  const stack = [...comments];
  while (stack.length > 0) {
    const current = stack.shift();
    if (!current) continue;
    result.push(current);
    if (current.replies.length > 0) stack.push(...current.replies);
  }
  return result;
}

async function callAiProvider(input: {
  url: string;
  apiKey: string;
  model: string;
  prompt: string;
  supportsResponseFormat: boolean;
}) {
  const body: Record<string, unknown> = {
    model: input.model,
    temperature: 0.35,
    max_tokens: 1100,
    messages: [
      {
        role: "system",
        content:
          "You are an analyst. Return ONLY valid JSON in the exact schema requested. No prose, no markdown fences, no extra keys.",
      },
      { role: "user", content: input.prompt },
    ],
  };
  if (input.supportsResponseFormat) body.response_format = { type: "json_object" };

  const res = await withTimeout(
    fetch(input.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${input.apiKey}` },
      body: JSON.stringify(body),
    }),
    AI_TIMEOUT_MS,
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI provider error (${res.status}): ${text.slice(0, 220)}`);
  }

  const completion = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = completion.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty AI response");
  return JSON.parse(extractJson(raw)) as unknown;
}

function deriveInteractionCount(post: {
  view_count: number;
  upvote_count: number;
  downvote_count: number;
  comment_count: number;
}): number {
  const base = post.view_count + post.upvote_count * 4 + post.downvote_count * 2 + post.comment_count * 6;
  return Math.max(0, Math.round(base));
}

function isRateLimitedError(message: string): boolean {
  return /\b429\b|rate limit|too many requests/i.test(message);
}

function buildDegradedConsensus(input: {
  analyzedComments: number;
  analyzedInteractions: number;
}): z.infer<typeof consensusSchema> {
  return {
    consensusLevel: 50,
    consensusLabel: "Mixed Opinions",
    agreements: [
      "Discussion shows useful operational signals but AI consensus generation is temporarily constrained.",
      "Use the current thread context and recent comments to guide next field actions.",
    ],
    debate: {
      question: "What should be prioritized until full AI consensus is available again?",
      sideA: {
        title: "Act on latest signals",
        points: [
          "Prioritize comments with repeated risk or procurement references.",
          "Document immediate mitigation choices in the next site update.",
        ],
      },
      sideB: {
        title: "Wait for fuller synthesis",
        points: [
          "Review additional incoming comments before locking decisions.",
          "Re-run consensus shortly to include broader discussion context.",
        ],
      },
    },
    recommendations: [
      "Review the top-voted comments and capture one action item per theme.",
      "Cross-check this thread with related Site Journals and tags.",
      "Retry AI consensus in a few minutes for a fuller synthesis.",
    ],
    confidence: "Low",
    analyzedComments: input.analyzedComments,
    analyzedInteractions: input.analyzedInteractions,
  };
}

export async function GET(req: Request, context: RouteContext) {
  const { slug } = await context.params;
  const post = await getForumPostBySlug(decodeURIComponent(slug));
  if (!post) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  const cacheKey = `${post.slug}:${post.updated_at}:${post.comment_count}`;
  const cached = memoryCache.get(cacheKey);
  if (!force && cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800" },
    });
  }

  const comments = await getComments(post.id);
  const flattened = flattenComments(comments)
    .filter((c) => !c.is_deleted && c.content.trim().length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 28);

  if (flattened.length < 5) return new Response(null, { status: 204 });

  const analyzedInteractions = deriveInteractionCount(post);
  const commentPack = flattened
    .map((c, i) => `${i + 1}. (${c.score}) ${c.author_name}: ${c.content.replace(/\s+/g, " ").slice(0, 240)}`)
    .join("\n");

  const prompt = `Analyze this forum thread and return JSON in this exact shape:
{
  "consensusLevel": 78,
  "consensusLabel": "Strong Consensus",
  "agreements": ["...", "..."],
  "debate": {
    "question": "...",
    "sideA": { "title": "...", "points": ["..."] },
    "sideB": { "title": "...", "points": ["..."] }
  },
  "recommendations": ["..."],
  "confidence": "High",
  "analyzedComments": ${flattened.length},
  "analyzedInteractions": ${analyzedInteractions}
}

Rules:
- Keep agreements 2-4 bullets, each <= 160 chars.
- Debate question must be the PRIMARY disagreement and be phrased as a question.
- sideA/sideB titles must be short (<= 60 chars). points 2-4 each, <= 160 chars.
- Recommendations 3-6 actionable items, <= 140 chars each.
- consensusLabel must be one of: "Strong Consensus", "Mixed Opinions", "Highly Debated".
- consensusLevel should match label (Strong ~65-100, Mixed ~40-64, Debated ~0-39).
- confidence one of: High/Medium/Low based on clarity and comment count.

Thread:
Title: ${post.title}
Tags: ${(post.tags ?? []).join(", ")}
Opening post: ${String(post.content ?? "").replace(/\s+/g, " ").slice(0, 1400)}

Top comments:
${commentPack}`;

  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!groqKey && !openaiKey) return NextResponse.json({ error: "AI not configured." }, { status: 503 });

  const providers = [
    groqKey && {
      url: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: groqKey,
      model: GROQ_MODEL,
      supportsResponseFormat: false,
    },
    openaiKey && {
      url: "https://api.openai.com/v1/chat/completions",
      apiKey: openaiKey,
      model: OPENAI_MODEL,
      supportsResponseFormat: true,
    },
  ].filter(Boolean) as Array<{ url: string; apiKey: string; model: string; supportsResponseFormat: boolean }>;

  let sawRateLimit = false;
  for (const provider of providers) {
    try {
      const raw = await callAiProvider({
        url: provider.url,
        apiKey: provider.apiKey,
        model: provider.model,
        prompt,
        supportsResponseFormat: provider.supportsResponseFormat,
      });
      const validated = consensusSchema.safeParse(raw);
      if (!validated.success) throw new Error(validated.error.issues[0]?.message ?? "Invalid AI payload");

      const payload = validated.data;
      memoryCache.set(cacheKey, { payload, expiresAt: Date.now() + 15 * 60 * 1000 });
      return NextResponse.json(payload, {
        headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (isRateLimitedError(message)) sawRateLimit = true;
      logger.warn({ error: err }, "Forum consensus provider failed, trying fallback");
    }
  }

  if (sawRateLimit) {
    const degraded = buildDegradedConsensus({
      analyzedComments: flattened.length,
      analyzedInteractions,
    });
    return NextResponse.json(degraded, {
      status: 200,
      headers: {
        "Retry-After": String(DEGRADED_RETRY_AFTER_SECONDS),
        "X-AI-Degraded": "rate-limited",
        "Cache-Control": "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
      },
    });
  }

  return NextResponse.json({ error: "Consensus extraction failed." }, { status: 503 });
}
