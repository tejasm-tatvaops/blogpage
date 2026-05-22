"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Story } from "@/lib/storyService";
import { getSeenStoryIds, markStorySeen } from "@/lib/storySeenState";

export type StoryFeedData = {
  viewer_stories: Story[];
  feed_stories: Story[];
  total: number;
};

export function useStories(enabled = true) {
  const [data, setData] = useState<StoryFeedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const res = await globalThis.fetch("/api/stories", { signal: ctrl.signal });
      if (!res.ok) throw new Error("Failed to fetch stories");
      const json = (await res.json()) as StoryFeedData;

      // Merge localStorage seen state so rings are muted instantly without
      // waiting for server-side StoryView records to propagate back.
      const localSeen = getSeenStoryIds();
      json.feed_stories = json.feed_stories.map((s) =>
        localSeen.has(s.id) ? { ...s, has_viewed: true } : s,
      );

      // Unseen-first ordering based on local state
      json.feed_stories.sort((a, b) => {
        const aS = a.has_viewed ? 1 : 0;
        const bS = b.has_viewed ? 1 : 0;
        return aS - bS;
      });

      setData(json);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Could not load stories.");
      }
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void fetch();
    return () => abortRef.current?.abort();
  }, [fetch]);

  const markViewed = useCallback(
    async (storyId: string, dwellTimeMs: number, completed: boolean) => {
      // Persist to localStorage immediately for instant ring muting
      markStorySeen(storyId);

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          feed_stories: prev.feed_stories.map((s) =>
            s.id === storyId ? { ...s, has_viewed: true } : s,
          ),
        };
      });

      await globalThis
        .fetch(`/api/stories/${storyId}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dwell_time_ms: dwellTimeMs, completed }),
        })
        .catch(() => undefined);
    },
    [],
  );

  const react = useCallback(
    async (storyId: string, reactionType: string) => {
      try {
        const res = await globalThis.fetch(`/api/stories/${storyId}/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reaction_type: reactionType }),
        });
        const json = (await res.json()) as { added: boolean };

        setData((prev) => {
          if (!prev) return prev;
          const delta = json.added ? 1 : -1;
          return {
            ...prev,
            feed_stories: prev.feed_stories.map((s) =>
              s.id === storyId
                ? {
                    ...s,
                    reactions_count: Math.max(0, s.reactions_count + delta),
                    viewer_reaction: json.added ? (reactionType as Story["viewer_reaction"]) : null,
                  }
                : s,
            ),
            viewer_stories: prev.viewer_stories.map((s) =>
              s.id === storyId
                ? {
                    ...s,
                    reactions_count: Math.max(0, s.reactions_count + delta),
                  }
                : s,
            ),
          };
        });
      } catch {
        // best-effort
      }
    },
    [],
  );

  const reply = useCallback(async (storyId: string, text: string) => {
    try {
      await globalThis.fetch(`/api/stories/${storyId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          feed_stories: prev.feed_stories.map((s) =>
            s.id === storyId ? { ...s, reply_count: s.reply_count + 1 } : s,
          ),
        };
      });
    } catch {
      // best-effort
    }
  }, []);

  const refetch = fetch;

  return { data, loading, error, markViewed, react, reply, refetch };
}
