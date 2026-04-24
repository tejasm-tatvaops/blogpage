/**
 * Shared text-transformation utilities used by all distribution channels.
 * Pure functions — no browser or Node.js globals, safe to call anywhere.
 */

export interface ContentPayload {
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  category?: string;
}

// ─── Text Cleaning ────────────────────────────────────────────────────────────

export const stripMarkdown = (value: string): string =>
  value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const trimToWords = (value: string, maxWords: number): string => {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return value;
  return `${words.slice(0, maxWords).join(" ").trim()}...`;
};

const splitSentences = (value: string): string[] =>
  value
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 18);

// ─── Content Builders ─────────────────────────────────────────────────────────

export const buildSummary = ({
  title,
  excerpt,
  content,
  minWords = 100,
  maxWords = 200,
}: {
  title: string;
  excerpt?: string;
  content?: string;
  minWords?: number;
  maxWords?: number;
}): string => {
  const excerptClean = stripMarkdown(excerpt ?? "");
  const bodyClean = stripMarkdown(content ?? "");

  const parts = [`${title}.`];
  if (excerptClean) parts.push(excerptClean);
  if (bodyClean) parts.push(bodyClean);

  const merged = parts.join(" ").replace(/\s+/g, " ").trim();
  const words = merged.split(/\s+/).filter(Boolean);
  if (words.length === 0) return title;
  if (words.length > maxWords) return trimToWords(merged, maxWords);
  if (words.length >= minWords) return merged;

  const padded = `${merged} ${excerptClean || title} ${bodyClean}`.replace(/\s+/g, " ").trim();
  return trimToWords(padded, minWords);
};

const toHashtag = (value: string): string =>
  `#${value
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join("")}`;

export const buildHashtags = (tags: string[] = [], category?: string): string[] => {
  const pool = [...tags, category ?? "", "Construction", "TatvaOps"].filter(Boolean);
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of pool) {
    const tag = toHashtag(item);
    if (tag.length <= 1) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(tag);
    if (output.length >= 6) break;
  }
  return output;
};

export const buildKeyPoints = (value: string): string[] => {
  const sentences = splitSentences(value);
  if (sentences.length === 0) return [];
  return sentences
    .slice(0, 3)
    .map((s) => trimToWords(s.replace(/[•\-]+/g, " ").trim(), 18));
};

export const openShareUrl = (shareUrl: string): void => {
  if (typeof window === "undefined") return;
  const opened = window.open(shareUrl, "_blank", "noopener,noreferrer");
  if (!opened) window.location.assign(shareUrl);
};
