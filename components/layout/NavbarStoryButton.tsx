"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { StoryUploadModal } from "@/components/stories/StoryUploadModal";
import { StoryViewer } from "@/components/stories/StoryViewer";
import type { Story } from "@/lib/storyService";

// Re-check story expiry every 60 seconds so the ring disappears on its own
const REFRESH_INTERVAL_MS = 60_000;

export function NavbarStoryButton() {
  const { data: session, status } = useSession();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [myStories, setMyStories] = useState<Story[]>([]);

  const displayName = session?.user?.name?.split(" ")[0] ?? "You";
  const hasActiveStory = myStories.length > 0;

  const fetchMyStories = async () => {
    try {
      const res = await fetch("/api/stories");
      if (!res.ok) return;
      const json = (await res.json()) as { viewer_stories?: Story[] };
      // Filter out any locally-known expired stories as a safety net
      const now = Date.now();
      const active = (json.viewer_stories ?? []).filter(
        (s) => new Date(s.expires_at).getTime() > now,
      );
      setMyStories(active);
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    void fetchMyStories();
    const id = setInterval(() => void fetchMyStories(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status]);

  if (status !== "authenticated" || !session?.user) return null;

  const handleClick = () => {
    if (hasActiveStory) {
      setViewerOpen(true);
    } else {
      setUploadOpen(true);
    }
  };

  return (
    <>
      <motion.button
        type="button"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={handleClick}
        title={hasActiveStory ? "Your story" : "Post a story"}
        aria-label={hasActiveStory ? "Your story" : "Post a story"}
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition"
      >
        {/* Gradient ring wraps the icon — orange when story active, subtle border when not */}
        <span
          className={[
            "flex h-full w-full items-center justify-center rounded-full p-[2px] transition-all duration-300",
            hasActiveStory
              ? "bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300"
              : "bg-transparent",
          ].join(" ")}
        >
          <span
            className={[
              "flex h-full w-full items-center justify-center rounded-full transition-colors",
              hasActiveStory
                ? "bg-app"
                : "border border-app bg-subtle hover:border-primary hover:text-primary",
            ].join(" ")}
          >
            {/* Camera icon */}
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={hasActiveStory ? "text-app" : "text-muted"}
              aria-hidden
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </span>
        </span>

        {/* Small + badge only when no active story */}
        {!hasActiveStory && (
          <span className="pointer-events-none absolute -right-0.5 -bottom-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[7px] font-bold text-white ring-1 ring-app">
            +
          </span>
        )}
      </motion.button>

      {/* Own story viewer */}
      <AnimatePresence>
        {viewerOpen && myStories.length > 0 && (
          <StoryViewer
            stories={myStories}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Upload composer */}
      <StoryUploadModal
        open={uploadOpen}
        displayName={displayName}
        onClose={() => setUploadOpen(false)}
        onPosted={() => {
          setUploadOpen(false);
          void fetchMyStories();
        }}
      />
    </>
  );
}
