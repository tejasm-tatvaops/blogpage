"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Story } from "@/lib/storyService";

const STORY_DURATION_MS = 5000;

type UseStoryViewerOptions = {
  stories: Story[];
  onClose: () => void;
  onView?: (storyId: string, dwellMs: number, completed: boolean) => void;
};

export function useStoryViewer({ stories, onClose, onView }: UseStoryViewerOptions) {
  const [groupIndex, setGroupIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const startTimeRef = useRef(Date.now());
  const pausedAtRef = useRef<number | null>(null);
  const pausedElapsedRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());

  const currentStory = stories[storyIndex] ?? null;

  // Group stories by identity_key
  const groups = (() => {
    const map = new Map<string, Story[]>();
    for (const s of stories) {
      const existing = map.get(s.identity_key) ?? [];
      existing.push(s);
      map.set(s.identity_key, existing);
    }
    return Array.from(map.values());
  })();

  const currentGroup = groups[groupIndex] ?? [];
  const currentGroupStory = currentGroup[storyIndex] ?? currentStory;

  const commitView = useCallback(
    (story: Story, completed: boolean) => {
      if (viewedRef.current.has(story.id)) return;
      viewedRef.current.add(story.id);
      const dwellMs = Date.now() - startTimeRef.current - pausedElapsedRef.current;
      onView?.(story.id, Math.max(0, dwellMs), completed);
    },
    [onView],
  );

  const goToNext = useCallback(() => {
    if (!currentGroupStory) return;
    commitView(currentGroupStory, true);

    if (storyIndex < currentGroup.length - 1) {
      setStoryIndex((i) => i + 1);
      setProgress(0);
      startTimeRef.current = Date.now();
      pausedElapsedRef.current = 0;
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((g) => g + 1);
      setStoryIndex(0);
      setProgress(0);
      startTimeRef.current = Date.now();
      pausedElapsedRef.current = 0;
    } else {
      onClose();
    }
  }, [storyIndex, currentGroup, groupIndex, groups, currentGroupStory, commitView, onClose]);

  const goToPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
      setProgress(0);
      startTimeRef.current = Date.now();
      pausedElapsedRef.current = 0;
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1] ?? [];
      setGroupIndex((g) => g - 1);
      setStoryIndex(Math.max(0, prevGroup.length - 1));
      setProgress(0);
      startTimeRef.current = Date.now();
      pausedElapsedRef.current = 0;
    }
  }, [storyIndex, groupIndex, groups]);

  const pause = useCallback(() => {
    setPaused(true);
    pausedAtRef.current = Date.now();
  }, []);

  const resume = useCallback(() => {
    if (pausedAtRef.current !== null) {
      pausedElapsedRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setPaused(false);
  }, []);

  // Progress ticker
  useEffect(() => {
    if (paused || !currentGroupStory) return;

    const tick = () => {
      const elapsed =
        Date.now() - startTimeRef.current - pausedElapsedRef.current;
      const pct = Math.min(1, elapsed / STORY_DURATION_MS);
      setProgress(pct);

      if (pct >= 1) {
        goToNext();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [paused, currentGroupStory, storyIndex, goToNext]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === " ") paused ? resume() : pause();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goToNext, goToPrev, onClose, pause, resume, paused]);

  return {
    currentStory: currentGroupStory ?? currentStory,
    currentGroup,
    groupIndex,
    storyIndex,
    progress,
    paused,
    totalGroups: groups.length,
    totalInGroup: currentGroup.length,
    goToNext,
    goToPrev,
    pause,
    resume,
    goToGroup: (i: number) => {
      setGroupIndex(Math.max(0, Math.min(groups.length - 1, i)));
      setStoryIndex(0);
      setProgress(0);
      startTimeRef.current = Date.now();
      pausedElapsedRef.current = 0;
    },
  };
}
