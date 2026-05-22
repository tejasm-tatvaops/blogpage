"use client";

import { useEffect } from "react";
import type { Story } from "@/lib/storyService";

export function useStoryPreload(stories: Story[], currentIndex: number) {
  useEffect(() => {
    // Preload adjacent story media
    const indices = [currentIndex + 1, currentIndex + 2].filter(
      (i) => i >= 0 && i < stories.length,
    );

    for (const i of indices) {
      const story = stories[i];
      if (!story?.media_url) continue;
      if (story.media_type === "image") {
        const img = new Image();
        img.src = story.media_url;
      }
    }
  }, [stories, currentIndex]);
}
