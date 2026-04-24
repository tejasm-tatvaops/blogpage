import { buildSummary, buildHashtags, buildKeyPoints, openShareUrl, type ContentPayload } from "./shared";

export interface LinkedInPayload {
  text: string;
  url: string;
  shareUrl: string;
}

export const transform = (
  payload: ContentPayload,
  resolvedUrl: string,
): LinkedInPayload => {
  const summary = buildSummary({
    title: payload.title,
    excerpt: payload.excerpt,
    content: payload.content,
    minWords: 80,
    maxWords: 140,
  });
  const hashtags = buildHashtags(payload.tags, payload.category);
  const keyPoints = buildKeyPoints(summary);

  const points =
    keyPoints.length > 0
      ? `Key takeaways:\n${keyPoints.map((p) => `• ${p}`).join("\n")}\n\n`
      : "";

  const text = `\uD83D\uDD0D ${payload.title}\n\n${summary}\n\n${points}${hashtags.join(" ")}\n\nRead full article: ${resolvedUrl}`;

  return {
    text,
    url: resolvedUrl,
    shareUrl: `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`,
  };
};

/** Opens the LinkedIn share dialog in a new tab (client-side only). */
export const share = (payload: ContentPayload, resolvedUrl: string): void => {
  const { shareUrl } = transform(payload, resolvedUrl);
  openShareUrl(shareUrl);
};
