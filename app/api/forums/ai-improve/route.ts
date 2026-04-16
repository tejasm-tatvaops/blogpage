import { NextResponse } from "next/server";
import { z } from "zod";
import { generateBlogLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

const AI_TIMEOUT_MS = 8_000;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const inputSchema = z.object({
  title: z.string().min(3).max(300).trim(),
  content: z.string().min(10).max(10_000).trim(),
});

type ImproveResult = {
  title: string;
  content: string;
  tags: string[];
};

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("AI request timed out")), ms),
    ),
  ]);

const extractJson = (text: string): string => {
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text.trim();
};

const callAiProvider = async (
  url: string,
  apiKey: string,
  model: string,
  prompt: string,
  supportsResponseFormat: boolean,
): Promise<ImproveResult> => {
  const body: Record<string, unknown> = {
    model,
    temperature: 0.6,
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful writing assistant. Return only valid JSON with keys: title (string), content (markdown string), tags (string array of 3-6 tags). No prose, no explanation.",
      },
      { role: "user", content: prompt },
    ],
  };
  if (supportsResponseFormat) body.response_format = { type: "json_object" };

  const res = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    }),
    AI_TIMEOUT_MS,
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI provider error (${res.status}): ${text.slice(0, 200)}`);
  }

  const completion = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = completion.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Empty AI response");

  const parsed = JSON.parse(extractJson(raw)) as Partial<ImproveResult>;
  if (!parsed.title || !parsed.content) throw new Error("AI response missing required fields");

  return {
    title: String(parsed.title).trim().slice(0, 300),
    content: String(parsed.content).trim().slice(0, 10_000),
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t).toLowerCase().trim().replace(/\s+/g, "-")).slice(0, 6)
      : [],
  };
};

export async function POST(request: Request) {
  const ip = getRateLimitKey(request);
  const rl = generateBlogLimiter(ip);
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = (await request.json()) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const { title, content } = parsed.data;

  const prompt = `Improve this forum post for a construction industry discussion platform.

Original title: ${title}
Original content:
${content}

Return JSON with:
- title: A more engaging, specific, and searchable version of the title (keep it under 120 chars)
- content: The content rewritten in clean Markdown — fix grammar, add structure (headers if needed), make it more readable. Keep the author's voice and intent.
- tags: 3-6 lowercase tag strings relevant to construction, project management, or the topic (no spaces, use hyphens)`;

  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    return NextResponse.json({ error: "AI not configured." }, { status: 503 });
  }

  const providers = [
    groqKey && {
      url: "https://api.groq.com/openai/v1/chat/completions",
      key: groqKey,
      model: GROQ_MODEL,
      json: false,
    },
    openaiKey && {
      url: "https://api.openai.com/v1/chat/completions",
      key: openaiKey,
      model: OPENAI_MODEL,
      json: true,
    },
  ].filter(Boolean) as Array<{ url: string; key: string; model: string; json: boolean }>;

  for (const provider of providers) {
    try {
      const result = await callAiProvider(
        provider.url,
        provider.key,
        provider.model,
        prompt,
        provider.json,
      );
      return NextResponse.json({ improved: result }, { status: 200 });
    } catch (err) {
      logger.warn({ error: err }, "AI improve provider failed, trying fallback");
    }
  }

  return NextResponse.json({ error: "AI improvement failed. Please try again." }, { status: 503 });
}
