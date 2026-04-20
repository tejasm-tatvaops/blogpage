import { NextRequest, NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blogService";
import { createRateLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { buildAskAiGraphContext, buildSourceAppendix } from "@/lib/askAiGraph";
import { getSystemToggles } from "@/lib/systemToggles";
import { recordMetric } from "@/lib/observability";
import { recordAskAiQualitySample } from "@/lib/askAiQualityMetrics";

const askAiLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

type Mode = "ask" | "summarize" | "eli5";
type RouteContext = { params: Promise<{ slug: string }> };

const SYSTEM_PROMPTS: Record<Mode, string> = {
  ask: "You answer questions strictly based on the provided platform knowledge pack. Keep it concise and accurate. Always cite supporting references as [S#]. If the answer is not in the sources, say so.",
  summarize:
    "Summarize the provided platform knowledge pack in under 220 words with key points and useful numbers/facts. Include [S#] citations.",
  eli5: "Explain the provided platform knowledge pack in very simple language for a beginner. Keep it short and clear. Include [S#] citations.",
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

  const graphEnabled = getSystemToggles().askAiGraphEnabled;
  const toggles = getSystemToggles();
  const graphContext = graphEnabled ? await buildAskAiGraphContext(post) : null;
  const articleContext = graphContext
    ? graphContext.contextText
    : truncateContent(post.content);
  const systemPrompt = SYSTEM_PROMPTS[mode];
  const userPrompt =
    mode === "ask"
      ? `Platform knowledge pack:\n\n${articleContext}\n\nQuestion:\n${question}\n\nReturn concise answer and cite references like [S1], [S2].`
      : `Platform knowledge pack:\n\n${articleContext}\n\nProvide concise output with [S#] citations.`;
  const maxSourceIndex = graphContext?.sources.length ?? 1;
  const firstAnswer = await tryGroqCompletion(systemPrompt, userPrompt).catch(() =>
    tryOpenAICompletion(systemPrompt, userPrompt),
  );
  if (!firstAnswer) {
    return NextResponse.json({ error: "AI service unavailable." }, { status: 503 });
  }
  const firstValidation = validateCitations(firstAnswer, maxSourceIndex);
  let answer = firstAnswer;
  let correctedUncited = false;
  if (graphEnabled && toggles.askAiCitationEnforcementEnabled && !firstValidation.valid) {
    const correctionPrompt =
      `${userPrompt}\n\nYour last answer had missing/invalid citations. Regenerate with valid [S#] references only in range [S1]...[S${maxSourceIndex}]. If unsupported, reply exactly: I cannot answer from the provided sources.`;
    const corrected = await tryGroqCompletion(systemPrompt, correctionPrompt).catch(() =>
      tryOpenAICompletion(systemPrompt, correctionPrompt),
    );
    if (corrected) {
      answer = corrected;
      correctedUncited = true;
    }
  }
  let finalValidation = validateCitations(answer, maxSourceIndex);
  if (graphEnabled && toggles.askAiCitationEnforcementEnabled && !finalValidation.valid) {
    answer = "I cannot answer from the provided sources. [S1]";
    finalValidation = validateCitations(answer, maxSourceIndex);
  }

  const conflictDetected =
    graphEnabled && toggles.askAiConflictDetectionEnabled && graphContext
      ? detectPotentialConflict(graphContext.sources.map((source) => source.snippet), question || mode)
      : false;
  const confidence = toggles.askAiConfidenceScoringEnabled
    ? scoreConfidence({
        sourceCount: graphContext?.sources.length ?? 1,
        citationCount: finalValidation.citations.length,
        citationValid: finalValidation.valid,
        retrievalQuality: graphContext
          ? Number(
              (
                graphContext.sources.reduce((acc, source) => acc + (source.trustScore * 0.65 + source.relevanceScore * 0.35), 0) /
                Math.max(1, graphContext.sources.length)
              ).toFixed(3),
            )
          : 0.6,
        conflictDetected,
      })
    : "medium";
  const confidenceLine = toggles.askAiConfidenceScoringEnabled ? `\n\nConfidence: ${confidence}` : "";
  const conflictLine = conflictDetected
    ? "\n\nSources disagree on at least one point. Review cited sources before acting."
    : "";

  recordMetric("ask_ai.request", {
    slug,
    mode,
    graph_enabled: graphEnabled,
    source_count: graphContext?.sources.length ?? 1,
    citation_enforcement_enabled: toggles.askAiCitationEnforcementEnabled,
    confidence_enabled: toggles.askAiConfidenceScoringEnabled,
    conflict_detection_enabled: toggles.askAiConflictDetectionEnabled,
    citation_compliant: finalValidation.valid,
    uncited_answer_corrected: correctedUncited,
    confidence,
    conflict_detected: conflictDetected,
    source_mix_tutorial: graphContext?.sourceMix.tutorial ?? 0,
    source_mix_blog: graphContext?.sourceMix.blog ?? 0,
    source_mix_forum: graphContext?.sourceMix.forum ?? 0,
    source_mix_short: graphContext?.sourceMix.short ?? 0,
    citation_density: Number((finalValidation.citations.length / Math.max(1, answer.split(/\s+/).length / 120)).toFixed(3)),
  });
  recordAskAiQualitySample({
    citationCompliant: finalValidation.valid,
    correctedUncited,
    confidence,
    conflictDetected,
    sourceMix: {
      tutorial: graphContext?.sourceMix.tutorial ?? 0,
      blog: graphContext?.sourceMix.blog ?? 0,
      forum: graphContext?.sourceMix.forum ?? 0,
      short: graphContext?.sourceMix.short ?? 0,
    },
  });

  const sourceAppendix = graphContext ? buildSourceAppendix(graphContext.sources) : "";
  const finalText = `${answer.trim()}${confidenceLine}${conflictLine}${sourceAppendix}`.trim();
  const responseStream = streamTextAsSse(finalText);

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function streamTextAsSse(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const chunks = text.match(/.{1,180}/gs) ?? [text];
      for (const token of chunks) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
}

function validateCitations(text: string, maxSourceIndex: number): { valid: boolean; citations: number[] } {
  const matches = [...text.matchAll(/\[S(\d+)\]/g)];
  const citations = matches
    .map((match) => Number(match[1]))
    .filter((n) => Number.isInteger(n));
  const inRange = citations.filter((n) => n >= 1 && n <= maxSourceIndex);
  return {
    valid: inRange.length > 0 && inRange.length === citations.length,
    citations: inRange,
  };
}

function detectPotentialConflict(snippets: string[], query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const queryTerms = lowerQuery
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length >= 4)
    .slice(0, 5);
  if (queryTerms.length === 0) return false;
  const positives = ["recommended", "best practice", "should", "prefer"];
  const negatives = ["not recommended", "avoid", "should not", "never", "deprecated"];
  const relevant = snippets.filter((snippet) => queryTerms.some((term) => snippet.toLowerCase().includes(term)));
  const hasPositive = relevant.some((snippet) => positives.some((cue) => snippet.toLowerCase().includes(cue)));
  const hasNegative = relevant.some((snippet) => negatives.some((cue) => snippet.toLowerCase().includes(cue)));
  return hasPositive && hasNegative;
}

function scoreConfidence(input: {
  sourceCount: number;
  citationCount: number;
  citationValid: boolean;
  retrievalQuality: number;
  conflictDetected: boolean;
}): "high" | "medium" | "low" {
  const sourceScore = Math.min(1, input.sourceCount / 6);
  const citationScore = input.citationValid ? Math.min(1, input.citationCount / 3) : 0;
  const conflictPenalty = input.conflictDetected ? 0.35 : 0;
  const score = sourceScore * 0.35 + citationScore * 0.35 + input.retrievalQuality * 0.3 - conflictPenalty;
  if (score >= 0.68) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

async function tryGroqCompletion(
  system: string,
  user: string,
): Promise<string | null> {
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
      stream: false,
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) return null;
  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content?.trim() ?? null;
}

async function tryOpenAICompletion(
  system: string,
  user: string,
): Promise<string | null> {
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
      stream: false,
      max_tokens: 700,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) return null;
  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content?.trim() ?? null;
}
