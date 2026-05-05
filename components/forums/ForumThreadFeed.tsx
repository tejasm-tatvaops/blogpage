"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ForumCard } from "@/components/forums/ForumCard";
import type { ForumPost } from "@/lib/forumService";

type ForumThreadFeedProps = {
  posts: ForumPost[];
  /** Fires when the thread nearest the viewport center changes (for sidebar / future AI). */
  onActiveThreadChange?: (post: ForumPost | null) => void;
};

const THRESHOLDS = Array.from({ length: 21 }, (_, i) => i / 20);
/** Longer idle window so alignment runs only after scrolling has settled. */
const IDLE_ALIGN_MS = 720;

function pickClosestToViewportCenter(cells: Map<string, HTMLElement>): string | null {
  if (typeof window === "undefined") return null;
  const vh = window.innerHeight;
  const center = vh / 2;
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const [id, el] of cells) {
    const r = el.getBoundingClientRect();
    if (r.bottom < 40 || r.top > vh - 40) continue;
    const cy = (r.top + r.bottom) / 2;
    const d = Math.abs(cy - center);
    if (d < bestDist) {
      bestDist = d;
      bestId = id;
    }
  }
  return bestId;
}

function subtleAlignToCenter(el: HTMLElement) {
  const vh = window.innerHeight;
  const r = el.getBoundingClientRect();
  const cy = (r.top + r.bottom) / 2;
  const bandLo = vh * 0.38;
  const bandHi = vh * 0.62;
  if (cy < bandLo || cy > bandHi) {
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }
}

export function ForumThreadFeed({ posts, onActiveThreadChange }: ForumThreadFeedProps) {
  const cellsRef = useRef<Map<string, HTMLElement>>(new Map());
  const postsRef = useRef(posts);
  const activeIdRef = useRef<string | null>(null);
  const onChangeRef = useRef(onActiveThreadChange);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number>(0);
  const ioRef = useRef<{ active: IntersectionObserver | null; reveal: IntersectionObserver | null }>({
    active: null,
    reveal: null,
  });

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());

  postsRef.current = posts;
  onChangeRef.current = onActiveThreadChange;

  const registerCell = useCallback((id: string, el: HTMLElement | null) => {
    const m = cellsRef.current;
    if (el) m.set(id, el);
    else m.delete(id);
  }, []);

  const scheduleRecompute = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const next = pickClosestToViewportCenter(cellsRef.current);
      setActiveThreadId((prev) => (prev === next ? prev : next));

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        const id = activeIdRef.current;
        if (!id) return;
        const el = cellsRef.current.get(id);
        if (el) subtleAlignToCenter(el);
      }, IDLE_ALIGN_MS);
    });
  }, []);

  useEffect(() => {
    activeIdRef.current = activeThreadId;
  }, [activeThreadId]);

  useEffect(() => {
    const post = activeThreadId ? postsRef.current.find((p) => p.id === activeThreadId) ?? null : null;
    onChangeRef.current?.(post);
  }, [activeThreadId]);

  useEffect(() => {
    const cells = cellsRef.current;
    if (posts.length === 0) {
      setActiveThreadId(null);
      return;
    }

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      ioRef.current.active?.disconnect();
      ioRef.current.reveal?.disconnect();

      const ioActive = new IntersectionObserver(() => {
        scheduleRecompute();
      }, { root: null, rootMargin: "0px", threshold: THRESHOLDS });

      const ioReveal = new IntersectionObserver(
        (entries) => {
          setRevealedIds((prev) => {
            const next = new Set(prev);
            for (const e of entries) {
              if (!e.isIntersecting) continue;
              const id = (e.target as HTMLElement).dataset.threadId;
              if (id) next.add(id);
            }
            return next;
          });
        },
        { root: null, rootMargin: "0px 0px 8% 0px", threshold: [0, 0.08, 0.15] },
      );

      ioRef.current = { active: ioActive, reveal: ioReveal };

      for (const p of posts) {
        const el = cells.get(p.id);
        if (el) {
          ioActive.observe(el);
          ioReveal.observe(el);
        }
      }

      scheduleRecompute();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      ioRef.current.active?.disconnect();
      ioRef.current.reveal?.disconnect();
      ioRef.current = { active: null, reveal: null };
      cancelAnimationFrame(rafRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [posts, scheduleRecompute]);

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-app p-12 text-center">
        <p className="font-sans text-[0.75rem] font-normal leading-[1.5] text-faint">
          No posts yet. Be the first to start a discussion.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {posts.map((post, index) => (
        <ForumCard
          key={post.id}
          ref={(el) => registerCell(post.id, el)}
          post={post}
          feedUi={{
            isActive: activeThreadId === post.id,
            revealed: revealedIds.has(post.id),
            index,
            staggerDelayMs: Math.min(index, 10) * 8,
          }}
        />
      ))}
    </div>
  );
}
