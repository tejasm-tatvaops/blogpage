"use client";

import { useCallback, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useStories } from "@/hooks/useStories";
import { StoryBubble } from "./StoryBubble";
import { StoryViewer } from "./StoryViewer";
import { StoryUploadModal } from "./StoryUploadModal";

import type { Story } from "@/lib/storyService";

type Props = {
  displayName?: string;
  className?: string;
};

function groupByUser(stories: Story[]): Story[] {
  const map = new Map<string, Story>();
  for (const s of stories) {
    if (!map.has(s.identity_key)) {
      map.set(s.identity_key, s);
    }
  }
  return Array.from(map.values());
}

export function StoriesRail({ displayName = "You", className }: Props) {
  const { data, loading, markViewed, react, reply, refetch } = useStories();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerStartIndex, setViewerStartIndex] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const railRef = useRef<HTMLDivElement>(null);

  // For momentum-scroll drag behavior
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);
  const isDragging = useRef(false);

  const feedStories = data?.feed_stories ?? [];
  const viewerStories = data?.viewer_stories ?? [];
  const bubbles = groupByUser(feedStories);

  const openViewer = useCallback(
    (identityKey: string) => {
      const idx = feedStories.findIndex((s) => s.identity_key === identityKey);
      setViewerStartIndex(Math.max(0, idx));
      setViewerOpen(true);
    },
    [feedStories],
  );

  const openOwnStory = useCallback(() => {
    if (viewerStories.length > 0) {
      // Show own stories in viewer (pass own stories first)
      setViewerStartIndex(0);
      setViewerOpen(true);
    } else {
      setUploadOpen(true);
    }
  }, [viewerStories]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const el = railRef.current;
    if (!el) return;
    isDragging.current = true;
    dragStartX.current = e.pageX - el.offsetLeft;
    dragScrollLeft.current = el.scrollLeft;
    el.style.cursor = "grabbing";
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !railRef.current) return;
    e.preventDefault();
    const x = e.pageX - railRef.current.offsetLeft;
    railRef.current.scrollLeft = dragScrollLeft.current - (x - dragStartX.current);
  };

  const endDrag = () => {
    isDragging.current = false;
    if (railRef.current) railRef.current.style.cursor = "grab";
  };

  // Always render the rail — even when empty — so the "Your Story +" bubble
  // is always discoverable as the primary upload entry point.
  // Only skip rendering entirely during the first SSR frame.
  const showFeedSection = loading || bubbles.length > 0;

  return (
    <>
      <div
        className={`relative w-full overflow-hidden ${className ?? ""}`}
      >
        {/* Rail */}
        <div
          ref={railRef}
          className="flex items-start gap-3 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ cursor: "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
        >
          {/* Your Story bubble — ALWAYS first, primary upload entry point */}
          <StoryBubble
            story={viewerStories[0] ?? null}
            label={displayName}
            isViewer
            hasActive={viewerStories.length > 0}
            onClick={openOwnStory}
          />

          {/* Separator — only show when there are community stories */}
          {showFeedSection && (
            <div className="h-14 w-px shrink-0 self-center bg-surface/15" />
          )}

          {/* Feed story bubbles */}
          {loading
            ? Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex flex-shrink-0 flex-col items-center gap-2">
                  <div className="h-[58px] w-[58px] animate-pulse rounded-full bg-surface/20" />
                  <div className="h-2.5 w-12 animate-pulse rounded bg-surface/15" />
                </div>
              ))
            : bubbles.map((story) => (
                <StoryBubble
                  key={story.identity_key}
                  story={story}
                  label={story.display_name}
                  onClick={() => openViewer(story.identity_key)}
                />
              ))}
        </div>

        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-app to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-app to-transparent" />
      </div>

      {/* Story viewer */}
      <AnimatePresence>
        {viewerOpen && (
          <StoryViewer
            stories={viewerOpen && viewerStories.length > 0 && viewerStartIndex === 0
              ? [...viewerStories, ...feedStories]
              : feedStories}
            initialIndex={viewerStartIndex}
            onClose={() => {
              setViewerOpen(false);
            }}
            onView={markViewed}
            onReact={react}
            onReply={reply}
          />
        )}
      </AnimatePresence>

      {/* Upload modal — refetches feed on success so new story animates into rail */}
      <StoryUploadModal
        open={uploadOpen}
        displayName={displayName}
        onClose={() => setUploadOpen(false)}
        onPosted={() => {
          setUploadOpen(false);
          void refetch();
        }}
      />
    </>
  );
}
