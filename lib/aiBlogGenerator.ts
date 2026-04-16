import { logger } from "./logger";
import { resolveBlogCoverImage } from "./imageService";

type GeneratedBlogResponse = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  tags: string[];
  category: string;
  cover_image: string;
};

type ReferenceItem = {
  title: string;
  url: string;
  publisher?: string;
  year?: number;
};

type ParsedAiPayload = Partial<GeneratedBlogResponse> & {
  references?: unknown;
};

const toSlug = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const isInternalReference = (url: string): boolean => {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("tatvaops");
  } catch {
    return true;
  }
};

const fallbackReferences = (): ReferenceItem[] => [
  {
    title: "Central Public Works Department (CPWD)",
    url: "https://cpwd.gov.in/",
    publisher: "Government of India",
  },
  {
    title: "Bureau of Indian Standards (BIS)",
    url: "https://www.bis.gov.in/",
    publisher: "BIS",
  },
  {
    title: "Reserve Bank of India - Publications",
    url: "https://www.rbi.org.in/",
    publisher: "RBI",
  },
  {
    title: "Ministry of Statistics and Programme Implementation (MOSPI)",
    url: "https://mospi.gov.in/",
    publisher: "Government of India",
  },
];

const sanitizeReferences = (value: unknown): ReferenceItem[] => {
  if (!Array.isArray(value)) return [];

  const references: ReferenceItem[] = [];

  for (const raw of value) {
    const item = raw as Record<string, unknown>;
    const title = String(item.title ?? "").trim();
    const url = String(item.url ?? "").trim();
    const publisher = String(item.publisher ?? "").trim();
    const yearRaw = Number(item.year);
    const year = Number.isFinite(yearRaw) ? Math.floor(yearRaw) : undefined;

    if (!title || !url || !isValidHttpUrl(url) || isInternalReference(url)) continue;
    references.push({
      title: title.slice(0, 180),
      url,
      ...(publisher ? { publisher: publisher.slice(0, 120) } : {}),
      ...(year && year >= 1900 && year <= 2100 ? { year } : {}),
    });

    if (references.length >= 6) break;
  }

  return references;
};

const appendReferencesSection = (content: string, references: ReferenceItem[]): string => {
  const trimmedContent = content.trim();
  if (/^##\s+references\b/im.test(trimmedContent)) return trimmedContent;

  const finalReferences = references.length >= 3 ? references : fallbackReferences().slice(0, 4);
  if (finalReferences.length === 0) return trimmedContent;

  const lines = finalReferences.map((reference) => {
    const metaParts = [reference.publisher, reference.year?.toString()].filter(Boolean);
    const meta = metaParts.length > 0 ? ` (${metaParts.join(", ")})` : "";
    return `- [${reference.title}](${reference.url})${meta}`;
  });

  return `${trimmedContent}\n\n## References\n\n${lines.join("\n")}`;
};

export const extractJsonPayload = (text: string): string => {
  const trimmed = text.trim();

  // Handle fenced markdown code blocks: ```json ... ```
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();

  // Fallback: pick first object-like payload if provider wraps extra prose.
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
};

const parseAiJson = (text: string): Omit<GeneratedBlogResponse, "cover_image"> => {
  const parsed = JSON.parse(extractJsonPayload(text)) as ParsedAiPayload;
  if (!parsed.title || !parsed.excerpt || !parsed.content || !parsed.category) {
    throw new Error("AI response missing required fields.");
  }

  const references = sanitizeReferences(parsed.references);

  return {
    title: parsed.title,
    slug: toSlug(parsed.slug || parsed.title),
    excerpt: parsed.excerpt.slice(0, 300),
    content: appendReferencesSection(parsed.content, references),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t)).slice(0, 10) : [],
    category: parsed.category,
  };
};

const AI_TIMEOUT_MS = 45_000;
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

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Retry fn up to maxAttempts times with exponential backoff. Only retries on network/timeout errors. */
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  baseDelayMs = 500,
): Promise<T> => {
  let lastError: Error = new Error("No attempts made.");
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error.");
      const isRetryable =
        lastError.message.includes("timed out") ||
        lastError.message.includes("fetch") ||
        lastError.message.includes("network") ||
        lastError.message.includes("ECONNRESET") ||
        lastError.message.includes("socket");
      if (!isRetryable || attempt === maxAttempts - 1) throw lastError;
      const delay = baseDelayMs * 2 ** attempt;
      await sleep(delay);
    }
  }
  throw lastError;
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
references: array of 3 to 6 objects with { title: string, url: string, publisher: string, year: number }

Content goals:
- High-intent search traffic around construction, BOQ, estimation, vendor workflows.
- Actionable and practical tone.
- Add one comparison table in markdown.
- Include at least 4 FAQs.
- Avoid fake statistics.
- Include one section on local cost factors (labor/materials/regulations/logistics).
- Add internal links where relevant: ${safeLinks.length ? safeLinks.join(", ") : "/blog"}.
- Include 4 to 6 external references from trustworthy sources (government, standards bodies, major research reports, reputed financial/news sources).
- Do NOT cite TatvaOps or internal links as references.
- Never invent links. If unsure, return fewer references rather than fake URLs.
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

      const aiResponse = await withRetry(
        () =>
          withTimeout(
            fetch(provider.url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${provider.apiKey}`,
              },
              body: JSON.stringify(body),
            }),
            AI_TIMEOUT_MS,
          ),
        2, // up to 2 attempts per provider before falling back
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

      const parsed = parseAiJson(content);
      const coverImage =
        (await resolveBlogCoverImage({
          title: parsed.title,
          category: parsed.category,
          tags: parsed.tags,
          existingCoverImage: null,
        })) ?? "";

      return {
        ...parsed,
        cover_image: coverImage,
      };
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
