import { NextResponse } from "next/server";
import { getForumPostBySlug } from "@/lib/forumService";
import { getComments, type Comment } from "@/lib/services/comment.service";

type RouteContext = { params: Promise<{ slug: string }> };
type Confidence = "high" | "medium" | "low";

const summaryCache = new Map<string, { expiresAt: number; payload: { summary: string; bullets: string[]; confidence: Confidence } }>();

const SYSTEM_PROMPT =
  "Summarize this forum thread into 3-4 concise bullet points. Focus on consensus, disagreements, and recurring concerns. Return plain text bullets only.";

function toFlatComments(comments: Comment[]): Comment[] {
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

function parseBullets(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function estimateConfidence(commentCount: number, bullets: number): Confidence {
  if (commentCount >= 12 && bullets >= 3) return "high";
  if (commentCount >= 5 && bullets >= 2) return "medium";
  return "low";
}

async function callOpenAI(userPrompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      max_tokens: 350,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  }).catch(() => null);
  if (!response || !response.ok) return null;
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

async function callGroq(userPrompt: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      max_tokens: 350,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  }).catch(() => null);
  if (!response || !response.ok) return null;
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? null;
}

async function summarizeThread(prompt: string): Promise<string | null> {
  const groq = await callGroq(prompt);
  if (groq) return groq;
  return callOpenAI(prompt);
}

export async function GET(_req: Request, context: RouteContext) {
  const { slug } = await context.params;
  const post = await getForumPostBySlug(decodeURIComponent(slug));
  if (!post) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

  const cacheKey = `${post.slug}:${post.updated_at}:${post.comment_count}`;
  const cached = summaryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.payload, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800" },
    });
  }

  const comments = await getComments(post.id);
  const flattened = toFlatComments(comments)
    .filter((comment) => !comment.is_deleted && comment.content.trim().length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 14);

  if (flattened.length < 3) {
    return NextResponse.json({ summary: "", bullets: [], confidence: "low" as Confidence });
  }

  const commentPack = flattened
    .map((comment, idx) => `${idx + 1}. ${comment.author_name}: ${comment.content.slice(0, 220)}`)
    .join("\n");

  const prompt = [
    `Thread title: ${post.title}`,
    `Thread tags: ${post.tags.join(", ")}`,
    `Opening post: ${post.content.slice(0, 1200)}`,
    "Top comments:",
    commentPack,
  ].join("\n\n");

  const summary = (await summarizeThread(prompt))?.trim() ?? "";
  const bullets = parseBullets(summary);
  if (bullets.length === 0) {
    return NextResponse.json({ summary: "", bullets: [], confidence: "low" as Confidence });
  }

  const payload = {
    summary,
    bullets,
    confidence: estimateConfidence(flattened.length, bullets.length),
  };
  summaryCache.set(cacheKey, { payload, expiresAt: Date.now() + 15 * 60 * 1000 });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=900, stale-while-revalidate=1800" },
  });
}
