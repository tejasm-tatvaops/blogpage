import { buildSummary, buildHashtags, trimToWords, type ContentPayload } from "./shared";

export interface InstagramPayload {
  caption: string;
  hashtags: string[];
  /** Full caption ready to paste into Instagram */
  fullCaption: string;
  /** Cover image URL for the post (use as first frame) */
  imageUrl: string | null;
}

/**
 * Builds an Instagram-optimised caption.
 *
 * Instagram has no web share intent URL. The client-side flow is:
 *   1. Build the caption text
 *   2. Copy it to clipboard
 *   3. Open instagram.com so the user can paste it
 *
 * On mobile devices, navigator.share() can deep-link into the Instagram app.
 */
export const transform = (
  payload: ContentPayload & { imageUrl?: string | null },
): InstagramPayload => {
  const summary = buildSummary({
    title: payload.title,
    excerpt: payload.excerpt,
    content: payload.content,
    minWords: 40,
    maxWords: 80,
  });
  const hashtags = buildHashtags(payload.tags, payload.category);

  // Instagram captions: hook + 2 insights + CTA + hashtag block
  const hook = trimToWords(summary, 20);
  const caption = `${payload.title}\n\n${hook}`;
  const hashBlock = hashtags.join(" ");
  const fullCaption = `${caption}\n\n.\n.\n.\n${hashBlock}`;

  return {
    caption,
    hashtags,
    fullCaption,
    imageUrl: payload.imageUrl ?? null,
  };
};

/**
 * Client-side Instagram share flow:
 *   - Mobile: tries navigator.share (deep-links into Instagram app)
 *   - Desktop: copies caption to clipboard, then opens instagram.com
 *
 * Returns true if native share was used, false if clipboard fallback was used.
 */
export const share = async (
  payload: ContentPayload & { imageUrl?: string | null },
  resolvedUrl: string,
): Promise<boolean> => {
  const { fullCaption } = transform(payload);

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    // navigator.share is available but only reliable on mobile
    /Mobi|Android/i.test(navigator.userAgent)
  ) {
    try {
      await navigator.share({ title: payload.title, text: fullCaption, url: resolvedUrl });
      return true;
    } catch {
      // User cancelled or API failed — fall through to clipboard
    }
  }

  try {
    await navigator.clipboard.writeText(fullCaption);
  } catch {
    // clipboard not available — nothing we can do
  }
  window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  return false;
};
