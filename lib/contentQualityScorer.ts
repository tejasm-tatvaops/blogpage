/**
 * Content Quality Scorer
 *
 * Sends article content to Groq/OpenAI and returns structured scores:
 *   seoScore        — 0-100: meta relevance, heading structure, keyword usage
 *   readabilityScore — 0-100: sentence length, vocabulary, flow
 *   keywordDensity  — 0-100: focus keyword presence (not stuffed, not absent)
 *   suggestions     — up to 5 concrete improvement hints
 */

export type QualityReport = {
  seoScore: number;
  readabilityScore: number;
  keywordDensity: number;
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  suggestions: string[];
};

const gradeFromScore = (score: number): QualityReport["grade"] => {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
};

const PROMPT = (title: string, excerpt: string, content: string) => `
You are a professional content quality analyst. Evaluate the blog post below and return ONLY valid JSON (no markdown fences, no extra text).

Blog title: ${title}
Excerpt: ${excerpt}

Content (truncated to 2000 words):
${content.split(/\s+/).slice(0, 2000).join(" ")}

Return this exact JSON shape:
{
  "seoScore": <integer 0-100>,
  "readabilityScore": <integer 0-100>,
  "keywordDensity": <integer 0-100>,
  "suggestions": [<string>, ...]  // max 5 items, each under 120 chars
}

Scoring guide:
- seoScore: title has focus keyword, H2s are keyword-rich, meta excerpt is compelling, good internal structure
- readabilityScore: avg sentence <20 words, no jargon walls, good paragraph breaks, varied sentence length
- keywordDensity: focus keyword appears naturally (0.5-2.5% = ideal), not stuffed, not absent
- suggestions: concrete, actionable, specific to this article
`.trim();

async function callAI(
  title: string,
  excerpt: string,
  content: string,
): Promise<QualityReport> {
  const prompt = PROMPT(title, excerpt, content);

  const groqKey = process.env.GROQ_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  let raw: string | null = null;

  // Try Groq first
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        raw = data.choices?.[0]?.message?.content ?? null;
      }
    } catch {
      raw = null;
    }
  }

  // Fallback to OpenAI
  if (!raw && openAiKey) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        max_tokens: 400,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      raw = data.choices?.[0]?.message?.content ?? null;
    }
  }

  if (!raw) throw new Error("AI service unavailable for quality scoring.");

  // Strip accidental markdown fences
  const cleaned = raw.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(cleaned) as {
    seoScore?: unknown;
    readabilityScore?: unknown;
    keywordDensity?: unknown;
    suggestions?: unknown;
  };

  const clamp = (v: unknown) => Math.min(100, Math.max(0, Number(v) || 0));

  const seoScore = clamp(parsed.seoScore);
  const readabilityScore = clamp(parsed.readabilityScore);
  const keywordDensity = clamp(parsed.keywordDensity);
  const overallScore = Math.round((seoScore + readabilityScore + keywordDensity) / 3);

  const suggestions = Array.isArray(parsed.suggestions)
    ? (parsed.suggestions as unknown[])
        .slice(0, 5)
        .map((s) => String(s).slice(0, 150))
    : [];

  return {
    seoScore,
    readabilityScore,
    keywordDensity,
    overallScore,
    grade: gradeFromScore(overallScore),
    suggestions,
  };
}

export const scoreContent = callAI;
