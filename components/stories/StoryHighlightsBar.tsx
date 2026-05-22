"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { StoryHighlight } from "@/lib/storyHighlightService";
import { StoryViewer } from "./StoryViewer";
import type { Story } from "@/lib/storyService";

const ICON_EMOJI: Record<string, string> = {
  hardhat: "🦺",
  blueprint: "📐",
  concrete: "🧱",
  safety: "⚠️",
  tools: "🔧",
  site: "🏗️",
  water: "💧",
  electric: "⚡",
  structure: "🏛️",
  inspection: "🔍",
};

type Props = {
  identityKey?: string;
};

export function StoryHighlightsBar({ identityKey }: Props) {
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<StoryHighlight | null>(null);
  const [highlightStories, setHighlightStories] = useState<Story[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = identityKey
      ? `/api/stories/highlights?identity=${encodeURIComponent(identityKey)}`
      : "/api/stories/highlights";

    void (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const json = (await res.json()) as { highlights: StoryHighlight[] };
        setHighlights(json.highlights);
      } catch {
        // non-critical
      }
    })();
  }, [identityKey]);

  const openHighlight = async (highlight: StoryHighlight) => {
    setActiveHighlight(highlight);
    setLoading(true);
    try {
      const res = await fetch(`/api/stories/highlights/${highlight.id}`);
      if (!res.ok) throw new Error("fetch failed");
      const json = (await res.json()) as { stories: Story[] };
      setHighlightStories(json.stories);
      setViewerOpen(true);
    } catch {
      // fallback: show empty viewer
      setHighlightStories([]);
    } finally {
      setLoading(false);
    }
  };

  if (highlights.length === 0) return null;

  return (
    <>
      <div className="flex gap-4 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {highlights.map((h) => (
          <motion.button
            key={h.id}
            type="button"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => void openHighlight(h)}
            className="flex flex-shrink-0 flex-col items-center gap-1.5 outline-none"
            style={{ width: 64 }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-app bg-surface text-2xl shadow-sm transition hover:border-primary">
              {ICON_EMOJI[h.icon] ?? "📌"}
            </div>
            <span className="w-full truncate text-center text-[10px] font-semibold text-app">
              {h.title}
            </span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {viewerOpen && highlightStories.length > 0 && (
          <StoryViewer
            stories={highlightStories}
            onClose={() => {
              setViewerOpen(false);
              setHighlightStories([]);
              setActiveHighlight(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Loading indicator */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="rounded-2xl bg-app p-6 shadow-2xl">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface border-t-primary mx-auto" />
              <p className="mt-3 text-center text-sm text-muted">
                Loading {activeHighlight?.title}…
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
