import { NextRequest, NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blogService";
import { createRateLimiter, getRateLimitKey, rateLimitResponse } from "@/lib/rateLimit";
import { buildAskAiGraphContextWithQuery, buildSourceAppendix } from "@/lib/askAiGraph";
import { getProjectBySlugPersistent } from "@/lib/siteJournalService";
import { getForumPostBySlug } from "@/lib/forumService";
import { getSystemToggles } from "@/lib/systemToggles";
import { recordMetric } from "@/lib/observability";
import { recordAskAiQualitySample } from "@/lib/askAiQualityMetrics";

const askAiLimiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

type Mode = "ask" | "summarize" | "eli5";
type AiMode = "site_analyst" | "cost_strategist" | "planning_engineer" | "safety_auditor" | "debate_synthesizer";
type RouteContext = { params: Promise<{ slug: string }> };

const SYSTEM_PROMPTS: Record<Mode, string> = {
  ask: "You answer questions strictly based on the provided platform knowledge pack. Keep it concise and accurate. Always cite supporting references as [S#]. If the answer is not in the sources, say so.",
  summarize:
    "Summarize the provided platform knowledge pack in under 220 words with key points and useful numbers/facts. Include [S#] citations.",
  eli5: "Explain the provided platform knowledge pack in very simple language for a beginner. Keep it short and clear. Include [S#] citations.",
};

const AI_MODE_PROMPTS: Record<AiMode, string> = {
  site_analyst:
    "You are a Site Analyst. Focus on execution state, operational risks, recurring patterns, and immediate site actions grounded in source evidence.",
  cost_strategist:
    "You are a Cost Strategist. Focus on budget pressure, procurement volatility, and financially practical mitigation options grounded in source evidence.",
  planning_engineer:
    "You are a Planning Engineer. Focus on sequence dependencies, likely bottlenecks, and next-cycle execution planning grounded in source evidence.",
  safety_auditor:
    "You are a Safety Auditor. Focus on hazard cues, compliance gaps, and preventive controls grounded in source evidence. Do not invent incidents.",
  debate_synthesizer:
    "You are a Debate Synthesizer. Focus on consensus points, strongest conflicting viewpoints, and practical decision framing grounded in source evidence.",
};

const truncateContent = (content: string, maxWords = 3000): string => {
  const words = content.split(/\s+/);
  if (words.length <= maxWords) return content;
  return `${words.slice(0, maxWords).join(" ")}\n\n[Content truncated for context window]`;
};

// Safer timeout fetch: wraps AbortSignal.timeout in try/catch and surfaces the reason.
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function tryGroqCompletion(system: string, user: string): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[ask-ai] GROQ_API_KEY is not set — skipping Groq");
    return null;
  }

  // llama-3.3-70b-versatile is valid; override via env if needed.
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  console.log(`[ask-ai] Trying Groq model: ${model}`);

  let res: Response;
  try {
    res = await fetchWithTimeout(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          stream: false,
          max_tokens: 700,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      },
      30_000,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[ask-ai] Groq fetch failed (${msg})`);
    return null;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable body)");
    console.error(`[ask-ai] Groq HTTP ${res.status} for model=${model}: ${body}`);
    return null;
  }

  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content?.trim() ?? null;
  if (!text) console.error("[ask-ai] Groq returned empty content");
  return text;
}

async function tryOpenAICompletion(system: string, user: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[ask-ai] OPENAI_API_KEY is not set — skipping OpenAI");
    return null;
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  console.log(`[ask-ai] Trying OpenAI model: ${model}`);

  let res: Response;
  try {
    res = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          stream: false,
          max_tokens: 700,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      },
      30_000,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[ask-ai] OpenAI fetch failed (${msg})`);
    return null;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable body)");
    console.error(`[ask-ai] OpenAI HTTP ${res.status} for model=${model}: ${body}`);
    return null;
  }

  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content?.trim() ?? null;
  if (!text) console.error("[ask-ai] OpenAI returned empty content");
  return text;
}

// Explicit sequential fallback: Groq first, OpenAI if Groq returns null.
// Both functions return null (never throw) so .catch() was wrong — fixed here.
async function completeWithFallback(system: string, user: string): Promise<string | null> {
  const groqResult = await tryGroqCompletion(system, user);
  if (groqResult) return groqResult;

  console.warn("[ask-ai] Groq returned null — falling back to OpenAI");
  const openAiResult = await tryOpenAICompletion(system, user);
  if (!openAiResult) {
    console.error("[ask-ai] Both Groq and OpenAI returned null — all providers exhausted");
  }
  return openAiResult;
}

export async function POST(req: NextRequest, context: RouteContext) {
  const key = getRateLimitKey(req);
  const rl = askAiLimiter(key);
  if (!rl.allowed) return rateLimitResponse(rl);

  const { slug } = await context.params;

  let question = "";
  let mode: Mode = "ask";
  let aiMode: AiMode = "site_analyst";
  let extraContext = "";
  let anchorType: "blog" | "siteJournal" | "forum" = "blog";
  let sourceContext = "";
  let sourceAppendixFallback = "";
  try {
    const body = (await req.json()) as {
      question?: string;
      mode?: string;
      aiMode?: AiMode;
      anchorType?: "blog" | "siteJournal" | "forum";
      attachedContext?: string;
      ecosystemContext?: {
        currentPage?: string;
        currentSiteJournal?: string;
        timelineWeek?: string;
        city?: string;
        activeRisks?: string;
        tags?: string;
        relatedDiscussions?: string;
        contributorExpertise?: string;
        userIntent?: string;
      };
    };
    question = String(body.question ?? "").trim().slice(0, 500);
    if (body.mode === "summarize" || body.mode === "eli5") mode = body.mode;
    if (body.aiMode && AI_MODE_PROMPTS[body.aiMode]) aiMode = body.aiMode;
    anchorType = body.anchorType === "siteJournal" || body.anchorType === "forum" ? body.anchorType : "blog";
    const journal = anchorType === "siteJournal" ? await getProjectBySlugPersistent(slug, true) : null;
    const forum = anchorType === "forum" ? await getForumPostBySlug(decodeURIComponent(slug)) : null;
    if (anchorType === "siteJournal" && !journal) {
      return NextResponse.json({ error: "Site Journal not found." }, { status: 404 });
    }
    if (anchorType === "forum" && !forum) {
      return NextResponse.json({ error: "Forum thread not found." }, { status: 404 });
    }
    const journalContext = journal
      ? `Site Journal context:\n- Journal: ${journal.title}\n- City/Region: ${journal.city}, ${journal.region}\n- Timeline week: ${journal.timeline.week}\n- Stage: ${journal.timeline.stage}\n- Risks: ${journal.aiRiskPulse}\n- Procurement: ${journal.procurementSignal}\n- Recent entries: ${journal.timelineEntries.slice(0, 4).map((entry) => `${entry.weekLabel} ${entry.type}: ${entry.title} (${entry.note.slice(0, 120)})`).join(" | ")}\n`
      : "";
    const forumContext = forum
      ? `Forum thread context:\n- Thread: ${forum.title}\n- Tags: ${forum.tags.join(", ")}\n- Excerpt: ${forum.excerpt}\n- Opening post: ${truncateContent(forum.content, 1200)}\n- Comment count: ${forum.comment_count}\n- Linked blog: ${forum.linked_blog_slug ?? "None"}\n`
      : "";
    sourceContext = anchorType === "siteJournal" ? journalContext : anchorType === "forum" ? forumContext : "";
    sourceAppendixFallback =
      anchorType === "siteJournal"
        ? `\n\nSources:\n[S1] Site Journal: ${journal?.title ?? slug}`
        : anchorType === "forum"
          ? `\n\nSources:\n[S1] Forum thread: ${forum?.title ?? slug}`
          : "";
    const ecosystem = body.ecosystemContext;
    const attachedContext = String(body.attachedContext ?? "").trim().slice(0, 5000);
    const ecosystemContext = ecosystem
      ? `\n\nEcosystem context:\n- Current page: ${ecosystem.currentPage ?? ""}\n- Current site journal: ${ecosystem.currentSiteJournal ?? ""}\n- Timeline week: ${ecosystem.timelineWeek ?? ""}\n- Region/city: ${ecosystem.city ?? ""}\n- Active risks: ${ecosystem.activeRisks ?? ""}\n- Related discussions: ${ecosystem.relatedDiscussions ?? ""}\n- Contributor expertise: ${ecosystem.contributorExpertise ?? ""}\n- Tags: ${ecosystem.tags ?? ""}\n- User intent: ${ecosystem.userIntent ?? ""}\n`
      : "";
    const documentContext = attachedContext ? `\n\nAttached document excerpt:\n${attachedContext}\n` : "";
    extraContext = `${sourceContext}${ecosystemContext}${documentContext}`;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (mode === "ask" && !question) {
    return NextResponse.json({ error: "question is required for ask mode." }, { status: 400 });
  }

  const post = anchorType === "blog" ? await getPostBySlug(slug) : null;
  if (anchorType === "blog" && !post) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }

  const graphEnabled = getSystemToggles().askAiGraphEnabled;
  const toggles = getSystemToggles();
  let graphContext = null;
  try {
    graphContext = graphEnabled && post ? await buildAskAiGraphContextWithQuery(post, question || mode) : null;
  } catch (e) {
    console.error("buildAskAiGraphContext failed:", e);
  }
  const articleContext = graphContext
    ? graphContext.contextText
    : post
      ? truncateContent(post.content)
      : sourceContext;
  const systemPrompt = `${SYSTEM_PROMPTS[mode]} ${AI_MODE_PROMPTS[aiMode]}`;
  const surfaceFormatInstruction =
    anchorType === "siteJournal"
      ? "Response format: operational and predictive. Include timeline-aware implications, near-term risks, and 2-5 concrete actions."
      : anchorType === "forum"
        ? "Response format: consensus-oriented and contradiction-aware. Separate agreement points, disagreement points, and practical decision steps."
        : "Response format: educational + actionable. Be concise and implementation-oriented with practical checklists where helpful.";
  const userPrompt =
    mode === "ask"
      ? `Platform knowledge pack:\n\n${articleContext}${extraContext}\n\nQuestion:\n${question}\n\n${surfaceFormatInstruction}\n\nReturn concise answer and cite references like [S1], [S2].`
      : `Platform knowledge pack:\n\n${articleContext}${extraContext}\n\n${surfaceFormatInstruction}\n\nProvide concise output with [S#] citations.`;
  const maxSourceIndex = graphContext?.sources.length ?? 1;

  const firstAnswer = await completeWithFallback(systemPrompt, userPrompt);
  if (!firstAnswer) {
    return NextResponse.json({ error: "AI service unavailable." }, { status: 503 });
  }

  const firstValidation = validateCitations(firstAnswer, maxSourceIndex);
  let answer = firstAnswer;
  let correctedUncited = false;
  if (graphEnabled && toggles.askAiCitationEnforcementEnabled && !firstValidation.valid) {
    const correctionPrompt =
      `${userPrompt}\n\nYour last answer had missing/invalid citations. Regenerate with valid [S#] references only in range [S1]...[S${maxSourceIndex}]. If unsupported, reply exactly: I cannot answer from the provided sources.`;
    const corrected = await completeWithFallback(systemPrompt, correctionPrompt);
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

  try {
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
  } catch (e) {
    console.error("Metrics failed:", e);
  }

  const sourceAppendix = graphContext ? buildSourceAppendix(graphContext.sources) : sourceAppendixFallback;
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
