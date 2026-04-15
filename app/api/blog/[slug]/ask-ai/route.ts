import { NextRequest, NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blogService";
import { createRateLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";

const askAiLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

type Mode = "ask" | "summarize" | "eli5";
type RouteContext = { params: Promise<{ slug: string }> };

const SYSTEM_PROMPTS: Record<Mode, string> = {
  ask: "You answer questions strictly based on the provided article. Keep it concise and accurate.",
  summarize:
    "Summarize the provided article in under 220 words with key points and useful numbers/facts.",
  eli5: "Explain the provided article in very simple language for a beginner. Keep it short and clear.",
};

const truncateContent = (content: string, maxWords = 3000): string => {
  const words = content.split(/\s+/);
  if (words.length <= maxWords) return content;
  return `${words.slice(0, maxWords).join(" ")}\n\n[Content truncated for context window]`;
};

export async function POST(req: NextRequest, context: RouteContext) {
  const key = getRateLimitKey(req);
  const rl = askAiLimiter(key);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { slug } = await context.params;

  let question = "";
  let mode: Mode = "ask";
  try {
    const body = (await req.json()) as { question?: string; mode?: string };
    question = String(body.question ?? "").trim().slice(0, 500);
    if (body.mode === "summarize" || body.mode === "eli5") mode = body.mode;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (mode === "ask" && !question) {
    return NextResponse.json({ error: "question is required for ask mode." }, { status: 400 });
  }

  const post = await getPostBySlug(slug);
  if (!post) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  const articleContext = truncateContent(post.content);
  const systemPrompt = SYSTEM_PROMPTS[mode];
  const userPrompt =
    mode === "ask"
      ? `Article:\n\n${articleContext}\n\nQuestion:\n${question}`
      : `Article:\n\n${articleContext}`;

  const stream = await tryGroqStream(systemPrompt, userPrompt).catch(() =>
    tryOpenAIStream(systemPrompt, userPrompt),
  );

  if (!stream) {
    return NextResponse.json({ error: "AI service unavailable." }, { status: 503 });
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

async function tryGroqStream(
  system: string,
  user: string,
): Promise<ReadableStream<Uint8Array> | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
      stream: true,
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok || !res.body) return null;
  return transformProviderSseStream(res.body);
}

async function tryOpenAIStream(
  system: string,
  user: string,
): Promise<ReadableStream<Uint8Array> | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      stream: true,
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok || !res.body) return null;
  return transformProviderSseStream(res.body);
}

function transformProviderSseStream(
  providerBody: ReadableStream<Uint8Array>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = providerBody.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }
            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}
