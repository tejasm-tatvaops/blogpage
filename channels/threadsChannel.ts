import { buildSummary, buildHashtags, openShareUrl, trimToWords, type ContentPayload } from "./shared";

export interface ThreadsPayload {
  text: string;
  url: string;
  shareUrl: string;
}

/**
 * Threads favors a conversational, insight-led tone — shorter than LinkedIn,
 * richer than Twitter. Uses the official Threads intent URL.
 */
export const transform = (
  payload: ContentPayload,
  resolvedUrl: string,
): ThreadsPayload => {
  const summary = buildSummary({
    title: payload.title,
    excerpt: payload.excerpt,
    content: payload.content,
    minWords: 40,
    maxWords: 100,
  });
  const hashtags = buildHashtags(payload.tags, payload.category);

  // Conversational opener + 1–2 insights + CTA
  const lead = trimToWords(summary, 30);
  const hashLine = hashtags.slice(0, 4).join(" ");
  const text = `${payload.title}\n\n${lead}\n\n${hashLine}\n\nRead more \u2192 ${resolvedUrl}`;

  return {
    text,
    url: resolvedUrl,
    shareUrl: `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`,
  };
};

/** Opens the Threads share intent in a new tab (client-side only). */
export const share = (payload: ContentPayload, resolvedUrl: string): void => {
  const { shareUrl } = transform(payload, resolvedUrl);
  openShareUrl(shareUrl);
};
