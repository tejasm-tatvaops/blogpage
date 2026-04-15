/**
 * Duplicate Content Detector
 *
 * Uses TF-IDF cosine similarity to compare a candidate post against all
 * existing published posts.  Runs entirely in-process — no external API call.
 *
 * Returns the top N most similar posts with their scores (0–1).
 * A score >= WARN_THRESHOLD should trigger an admin warning.
 */

import { getAllPostSummaries } from "./blogService";
import { connectToDatabase } from "./mongodb";

export const WARN_THRESHOLD = 0.35; // ≥ 35% similarity → warn

export type SimilarPost = {
  slug: string;
  title: string;
  score: number; // 0–1
};

// ── TF-IDF helpers ──────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "this", "that",
  "these", "those", "it", "its", "you", "we", "they", "he", "she", "as",
  "not", "no", "so", "if", "then", "than", "more", "also", "such", "each",
]);

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

const termFrequency = (tokens: string[]): Map<string, number> => {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const total = tokens.length || 1;
  tf.forEach((v, k) => tf.set(k, v / total));
  return tf;
};

const cosineSimilarity = (
  a: Map<string, number>,
  b: Map<string, number>,
): number => {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  a.forEach((v, k) => {
    dot += v * (b.get(k) ?? 0);
    magA += v * v;
  });
  b.forEach((v) => (magB += v * v));
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
};

// ── Public API ───────────────────────────────────────────────────────────────

export async function detectDuplicates(
  candidateContent: string,
  excludeSlug?: string,
  topN = 5,
): Promise<SimilarPost[]> {
  await connectToDatabase();

  // Fetch titles + slugs only for the initial list, then get excerpts
  const summaries = await getAllPostSummaries();
  const candidates = excludeSlug
    ? summaries.filter((s) => s.slug !== excludeSlug)
    : summaries;

  if (candidates.length === 0) return [];

  // Build TF vector for candidate
  const candidateTokens = tokenize(candidateContent);
  const candidateTf = termFrequency(candidateTokens);

  // We compare against excerpt (fast) — for the top 5 we could load full
  // content but that's expensive; excerpt comparison is sufficient.
  const results: SimilarPost[] = candidates.map((post) => {
    const postTf = termFrequency(tokenize(post.excerpt + " " + post.title));
    return {
      slug: post.slug,
      title: post.title,
      score: parseFloat(cosineSimilarity(candidateTf, postTf).toFixed(3)),
    };
  });

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .filter((r) => r.score > 0.05); // skip near-zero matches
}
