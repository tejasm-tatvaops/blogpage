import { buildSummary, buildHashtags, openShareUrl, trimToWords, type ContentPayload } from "./shared";

export interface TwitterPayload {
  text: string;
  url: string;
  shareUrl: string;
}

export const transform = (
  payload: ContentPayload,
  resolvedUrl: string,
): TwitterPayload => {
  const summary = buildSummary({
    title: payload.title,
    excerpt: payload.excerpt,
    content: payload.content,
    minWords: 40,
    maxWords: 80,
  });
  const hashtags = buildHashtags(payload.tags, payload.category);
  const opener = `${trimToWords(payload.title, 10)}\n\n${trimToWords(summary, 26)}`;
  const hashLine = hashtags.slice(0, 3).join(" ");
  const text = `${opener}\n\n${hashLine}`.trim();

  return {
    text,
    url: resolvedUrl,
    shareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(resolvedUrl)}`,
  };
};

/** Opens the Twitter/X share intent in a new tab (client-side only). */
export const share = (payload: ContentPayload, resolvedUrl: string): void => {
  const { shareUrl } = transform(payload, resolvedUrl);
  openShareUrl(shareUrl);
};
