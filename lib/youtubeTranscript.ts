import { YoutubeTranscript } from "youtube-transcript";

export type TranscriptItem = { time: number; text: string };

const CHUNK_SECONDS = 30;

export async function fetchYouTubeTranscript(videoId: string): Promise<TranscriptItem[]> {
  try {
    const raw = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });

    // Group captions into 30-second buckets for readable paragraphs
    const buckets = new Map<number, string[]>();
    for (const item of raw) {
      const key = Math.floor(item.offset / 1000 / CHUNK_SECONDS) * CHUNK_SECONDS;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(item.text.replace(/\n/g, " ").trim());
    }

    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([time, texts]) => ({ time, text: texts.join(" ") }));
  } catch {
    // Video may have no captions or be unavailable — return empty so caller falls back gracefully
    return [];
  }
}
