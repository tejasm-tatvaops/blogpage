export function extractVideoSource(content?: string): string | null {
  if (!content) return null;
  const match = content.match(/^\s*Video source:\s*(https?:\/\/\S+)\s*$/im);
  return match?.[1] ?? null;
}

function getYoutubeVideoId(sourceUrl: string): string | null {
  try {
    const parsed = new URL(sourceUrl);
    const host = parsed.hostname.toLowerCase();

    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\/+/, "").split("/")[0];
      return id || null;
    }

    if (host.includes("youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      const parts = parsed.pathname.split("/").filter(Boolean);
      const markerIndex = parts.findIndex((segment) =>
        ["shorts", "embed", "live", "v"].includes(segment),
      );
      if (markerIndex >= 0 && parts[markerIndex + 1]) {
        return parts[markerIndex + 1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeTutorialVideoSourceUrl(sourceUrl: string): string {
  let normalizedSourceUrl = sourceUrl.trim();
  try {
    const parsed = new URL(normalizedSourceUrl);
    if (parsed.pathname.startsWith("/uploads/videos/")) {
      normalizedSourceUrl = parsed.pathname;
    }
  } catch {
    // Non-URL values (already relative paths) are fine as-is.
  }
  return normalizedSourceUrl;
}

/**
 * YouTube poster image for a stored tutorial video URL (listing cards, etc.).
 * Uses `hqdefault` for broad availability; `maxresdefault` often 404s on short/legacy uploads.
 */
export function getYoutubeThumbnailUrlFromSourceUrl(sourceUrl: string): string | null {
  const id = getYoutubeVideoId(normalizeTutorialVideoSourceUrl(sourceUrl));
  if (!id) return null;
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function getTutorialVideoSource(sourceUrl: string): {
  kind: "youtube" | "direct";
  url: string;
} {
  const normalizedSourceUrl = normalizeTutorialVideoSourceUrl(sourceUrl);

  const youtubeId = getYoutubeVideoId(normalizedSourceUrl);
  if (youtubeId) {
    return {
      kind: "youtube",
      url: `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`,
    };
  }
  return { kind: "direct", url: normalizedSourceUrl };
}

export function extractInlineVideoSource(content: string): { videoUrl: string | null; cleanedContent: string } {
  const sourceLineRegex = /^\s*Video source:\s*(https?:\/\/\S+)\s*$/im;
  const match = content.match(sourceLineRegex);
  const videoUrl = match?.[1] ?? null;
  const cleanedContent = content.replace(sourceLineRegex, "").replace(/\n{3,}/g, "\n\n").trim();
  return { videoUrl, cleanedContent };
}
