/**
 * Client-side seen-story persistence (localStorage).
 *
 * Complements the server-side StoryView model: gives instant UI feedback
 * (muted ring, rail re-ordering) without waiting for an API round-trip.
 *
 * Key: "tatvaops_seen_stories"
 * Value: { ids: string[]; ts: number }
 *
 * Capped at MAX_SEEN entries; oldest entries evicted first.
 * Auto-expires after 24h to match server TTL.
 */

const STORAGE_KEY = "tatvaops_seen_stories";
const MAX_SEEN = 500;
const TTL_MS = 24 * 60 * 60 * 1000;

type SeenPayload = {
  ids: string[];
  ts: number;
};

function load(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as SeenPayload;
    // Evict if older than 24h
    if (Date.now() - parsed.ts > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return new Set();
    }
    return new Set(parsed.ids);
  } catch {
    return new Set();
  }
}

function save(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    const arr = Array.from(ids).slice(-MAX_SEEN);
    const payload: SeenPayload = { ids: arr, ts: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function getSeenStoryIds(): Set<string> {
  return load();
}

export function markStorySeen(storyId: string): void {
  const seen = load();
  seen.add(storyId);
  save(seen);
}

export function isStorySeen(storyId: string): boolean {
  return load().has(storyId);
}

export function clearSeenStories(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
