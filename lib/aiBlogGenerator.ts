import { logger } from "./logger";

type GeneratedBlogResponse = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  category: string;
};

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const parseAiJson = (text: string): GeneratedBlogResponse => {
  const parsed = JSON.parse(text) as Partial<GeneratedBlogResponse>;
  if (!parsed.title || !parsed.excerpt || !parsed.content || !parsed.category) {
    throw new Error("AI response missing required fields.");
  }

  return {
    title: parsed.title,
    slug: toSlug(parsed.slug || parsed.title),
    excerpt: parsed.excerpt.slice(0, 300),
    content: parsed.content,
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t)).slice(0, 10) : [],
    category: parsed.category,
  };
};

const AI_TIMEOUT_MS = 25_000;
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new Error(`AI request timed out after ${ms / 1000}s.`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]);
};

export const generateBlogFromKeyword = async (
  keyword: string,
  internalLinks: string[] = [],
): Promise<GeneratedBlogResponse> => {
  const trimmedKeyword = keyword.trim().slice(0, 200);
  if (!trimmedKeyword) {
    throw new Error("Keyword is required.");
  }

  const groqApiKey = process.env.GROQ_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!groqApiKey && !openaiApiKey) {
    throw new Error("Neither GROQ_API_KEY nor OPENAI_API_KEY is configured.");
  }

  const safeLinks = internalLinks
    .filter((l) => typeof l === "string" && l.startsWith("/"))
    .slice(0, 8);

  const prompt = `You are an SEO construction-tech content strategist for TatvaOps.
Generate one blog post as strict JSON (no markdown wrapper, no prose).
Keyword: "${trimmedKeyword}"

Return JSON with keys:
title: string
slug: string
excerpt: string (max 170 chars)
content: markdown string with H1 title, intro, 4-6 H2 sections, FAQs section, and final CTA section titled "Read more on TatvaOps Blog"
tags: string[] (4 to 8 tags)
category: string

Content goals:
- High-intent search traffic around construction, BOQ, estimation, vendor workflows.
- Actionable and practical tone.
- Add one comparison table in markdown.
- Include at least 4 FAQs.
- Avoid fake statistics.
- Include one section on local cost factors (labor/materials/regulations/logistics).
- Add internal links where relevant: ${safeLinks.length ? safeLinks.join(", ") : "/blog"}.
`;

  const providers: Array<{
    name: "groq" | "openai";
    apiKey: string;
    url: string;
    model: string;
    supportsResponseFormat: boolean;
  }> = [];

  if (groqApiKey) {
    providers.push({
      name: "groq",
      apiKey: groqApiKey,
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: GROQ_MODEL,
      supportsResponseFormat: false,
    });
  }
  if (openaiApiKey) {
    providers.push({
      name: "openai",
      apiKey: openaiApiKey,
      url: "https://api.openai.com/v1/chat/completions",
      model: OPENAI_MODEL,
      supportsResponseFormat: true,
    });
  }

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      logger.info({ keyword: trimmedKeyword, provider: provider.name }, "Calling AI API");

      const body: Record<string, unknown> = {
        model: provider.model,
        temperature: 0.7,
        max_tokens: 4096,
        messages: [
          { role: "system", content: "Return only valid JSON for the requested schema." },
          { role: "user", content: prompt },
        ],
      };
      if (provider.supportsResponseFormat) {
        body.response_format = { type: "json_object" };
      }

      const aiResponse = await withTimeout(
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

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text().catch(() => "");
        throw new Error(`${provider.name} request failed (${aiResponse.status}): ${errorText.slice(0, 300)}`);
      }

      const completion = (await aiResponse.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = completion.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error(`${provider.name} returned empty content.`);
      }

      return parseAiJson(content);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown AI provider error.");
      logger.warn(
        { provider: provider.name, error: lastError.message },
        "AI provider failed, trying fallback if available",
      );
    }
  }

  throw new Error(lastError?.message || "All AI providers failed.");
};
