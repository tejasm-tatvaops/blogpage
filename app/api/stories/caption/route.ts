/**
 * AI Caption Assistance for Story Creation
 *
 * Generates a professional, construction-domain caption + hashtags for a story.
 *
 * POST /api/stories/caption
 * Body: { story_type, text?, tags?, location?, linked_blog_slug?, linked_forum_slug? }
 * Returns: { caption, hashtags, suggested_text? }
 */
import { NextResponse } from "next/server";
import { createRateLimiter, getRateLimitKey } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

const captionLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });

type CaptionBody = {
  story_type?: string;
  text?: string;
  tags?: string[];
  location?: string;
  linked_blog_slug?: string;
  linked_forum_slug?: string;
};

type GroqMessage = { role: "system" | "user" | "assistant"; content: string };
type GroqPayload = { model: string; messages: GroqMessage[]; max_tokens: number; temperature: number };
type GroqResponse = { choices?: { message?: { content?: string } }[] };

async function callGroq(payload: GroqPayload): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not configured");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Groq API error ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = (await res.json()) as GroqResponse;
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function callOpenAI(payload: GroqPayload): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ ...payload, model: "gpt-4o-mini" }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI API error ${res.status}: ${txt.slice(0, 200)}`);
  }

  const data = (await res.json()) as GroqResponse;
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

async function generateCaption(body: CaptionBody): Promise<{
  caption: string;
  hashtags: string[];
  suggested_text?: string;
}> {
  const contextParts: string[] = [];
  if (body.text) contextParts.push(`Story text: "${body.text.slice(0, 300)}"`);
  if (body.tags?.length) contextParts.push(`Topics: ${body.tags.join(", ")}`);
  if (body.location) contextParts.push(`Location: ${body.location}`);
  if (body.linked_blog_slug) contextParts.push(`Linked article: ${body.linked_blog_slug}`);
  if (body.linked_forum_slug) contextParts.push(`Linked discussion: ${body.linked_forum_slug}`);
  if (body.story_type) contextParts.push(`Story type: ${body.story_type}`);

  const context = contextParts.join("\n");

  const systemPrompt = `You are a professional caption writer for TatvaOps, a construction intelligence platform.
Write captions that are:
- Professional but conversational
- Construction/engineering domain-specific
- Under 120 characters (ideal for story overlays)
- Action-oriented and insightful
- Never generic or motivational-poster-style`;

  const userPrompt = `Generate a professional story caption for this construction field update.

${context}

Return JSON only (no prose, no markdown):
{
  "caption": "The caption text (under 120 chars)",
  "hashtags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggested_text": "Optional improved version of the story text if it seems weak (null if text is strong)"
}

Hashtags should be single words, construction-relevant, without #.`;

  const payload: GroqPayload = {
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 300,
    temperature: 0.65,
  };

  let raw: string;
  try {
    raw = await callGroq(payload);
  } catch {
    raw = await callOpenAI(payload);
  }

  // Parse JSON
  const clean = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const parsed = JSON.parse(clean) as {
      caption?: string;
      hashtags?: string[];
      suggested_text?: string | null;
    };
    return {
      caption: (parsed.caption ?? "").slice(0, 150),
      hashtags: (parsed.hashtags ?? []).slice(0, 8).map((h) => String(h).replace(/^#/, "").trim()),
      suggested_text: parsed.suggested_text ?? undefined,
    };
  } catch {
    // Fallback: extract caption from raw text
    return {
      caption: raw.slice(0, 120),
      hashtags: (body.tags ?? []).slice(0, 5),
    };
  }
}

export async function POST(request: Request) {
  const ip = getRateLimitKey(request);
  const rl = captionLimiter(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many caption requests." }, { status: 429 });
  }

  try {
    let body: CaptionBody;
    try {
      body = (await request.json()) as CaptionBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    }

    const result = await generateCaption(body);
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ error }, "POST /api/stories/caption error");
    return NextResponse.json({ error: "Caption generation failed." }, { status: 500 });
  }
}
