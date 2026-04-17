import { buildSummary, buildHashtags, buildKeyPoints, type ContentPayload } from "./shared";

export interface WhatsAppPayload {
  text: string;
  url: string;
  shareUrl: string;
}

export const transform = (
  payload: ContentPayload,
  resolvedUrl: string,
): WhatsAppPayload => {
  const summary = buildSummary({
    title: payload.title,
    excerpt: payload.excerpt,
    content: payload.content,
    minWords: 70,
    maxWords: 120,
  });
  const hashtags = buildHashtags(payload.tags, payload.category);
  const keyPoints = buildKeyPoints(summary);

  const points =
    keyPoints.length > 0
      ? `\nTop points:\n${keyPoints.map((p) => `- ${p}`).join("\n")}\n`
      : "";

  const text = `*${payload.title}*\n\n${summary}${points}\n${hashtags.join(" ")}\n\n${resolvedUrl}`;

  return {
    text,
    url: resolvedUrl,
    shareUrl: `https://wa.me/?text=${encodeURIComponent(text)}`,
  };
};

/** Opens the WhatsApp share dialog in a new tab (client-side only). */
export const share = (payload: ContentPayload, resolvedUrl: string): void => {
  const { shareUrl } = transform(payload, resolvedUrl);
  window.open(shareUrl, "_blank", "noopener,noreferrer");
};
