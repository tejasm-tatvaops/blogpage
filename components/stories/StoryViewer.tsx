"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Story } from "@/lib/storyService";
import { useStoryViewer } from "@/hooks/useStoryViewer";
import { useStoryPreload } from "@/hooks/useStoryPreload";
import { StoryProgressBars } from "./StoryProgressBars";
import { StoryReactionTray } from "./StoryReactionTray";

const BACKGROUND_STYLES: Record<string, string> = {
  "gradient-slate": "from-slate-950 via-slate-800 to-slate-950",
  "gradient-blue": "from-blue-950 via-blue-900 to-slate-950",
  "gradient-amber": "from-amber-950 via-amber-900 to-stone-950",
  "gradient-emerald": "from-emerald-950 via-emerald-900 to-slate-950",
  "gradient-purple": "from-purple-950 via-indigo-900 to-slate-950",
  "gradient-orange": "from-orange-950 via-red-900 to-zinc-950",
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

type Props = {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  onView?: (storyId: string, dwellMs: number, completed: boolean) => void;
  onReact?: (storyId: string, reaction: string) => void;
  onReply?: (storyId: string, text: string) => void;
};

export function StoryViewer({
  stories,
  onClose,
  onView,
  onReact,
  onReply,
}: Props) {
  const [replyText, setReplyText] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  const { currentStory, storyIndex, progress, paused, totalInGroup, goToNext, goToPrev, pause, resume } =
    useStoryViewer({ stories, onClose, onView });

  useStoryPreload(stories, storyIndex);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartXRef.current = t?.clientX ?? 0;
    touchStartYRef.current = t?.clientY ?? 0;
    pause();
  }, [pause]);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const t = e.changedTouches[0];
      const dx = (t?.clientX ?? 0) - touchStartXRef.current;
      const dy = (t?.clientY ?? 0) - touchStartYRef.current;

      // Swipe down to dismiss
      if (dy > 80 && Math.abs(dy) > Math.abs(dx) * 1.5) {
        onClose();
        return;
      }

      resume();

      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        // Tap navigation: left third → prev, right two-thirds → next
        const screenW = window.innerWidth;
        if ((t?.clientX ?? 0) < screenW / 3) {
          goToPrev();
        } else {
          goToNext();
        }
      }
    },
    [goToNext, goToPrev, onClose, resume],
  );

  const submitReply = useCallback(async () => {
    if (!replyText.trim() || !currentStory) return;
    onReply?.(currentStory.id, replyText.trim());
    setReplyText("");
    setReplyOpen(false);
  }, [replyText, currentStory, onReply]);

  if (!mounted || !currentStory) return null;

  const bgClass =
    BACKGROUND_STYLES[currentStory.background_style ?? "gradient-slate"] ??
    BACKGROUND_STYLES["gradient-slate"];

  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 select-none"
      initial={{ opacity: 0, scale: 1.04 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={pause}
      onMouseUp={resume}
    >
      {/* Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStory.id}
          className={`absolute inset-0 bg-gradient-to-br ${bgClass}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Media layer */}
          {currentStory.media_url && currentStory.media_type === "image" && (
            <img
              src={currentStory.media_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          )}
          {currentStory.media_url && currentStory.media_type === "video" && (
            <video
              src={currentStory.media_url}
              className="absolute inset-0 h-full w-full object-cover"
              autoPlay
              muted
              playsInline
              loop
            />
          )}

          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
        </motion.div>
      </AnimatePresence>

      {/* ── Top area ─────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
        {/* Progress bars */}
        <StoryProgressBars
          total={totalInGroup}
          currentIndex={storyIndex}
          progress={progress}
        />

        {/* Header */}
        <div className="pointer-events-auto flex items-center gap-3 px-4 pt-3 pb-2">
          {currentStory.avatar_url ? (
            <img
              src={currentStory.avatar_url}
              alt={currentStory.display_name}
              className="h-9 w-9 rounded-full border border-white/30 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/15 text-sm font-bold text-white">
              {currentStory.display_name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-semibold text-white leading-tight">
              {currentStory.display_name}
            </p>
            <p className="text-[11px] text-white/70">
              {formatRelativeTime(currentStory.created_at)}
              {currentStory.location ? ` · ${currentStory.location}` : ""}
            </p>
          </div>

          {/* Tags */}
          {currentStory.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="hidden sm:inline-flex shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur-sm"
            >
              #{tag}
            </span>
          ))}

          <button
            type="button"
            onClick={onClose}
            className="ml-auto shrink-0 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20"
            aria-label="Close story"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Content layer ─────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStory.id + "-content"}
          className="absolute inset-0 flex flex-col items-center justify-center px-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Text story */}
          {currentStory.story_type === "text" && currentStory.text && (
            <p className="text-center text-2xl font-bold leading-snug text-white drop-shadow-lg sm:text-3xl max-w-sm">
              {currentStory.text}
            </p>
          )}

          {/* Poll story */}
          {currentStory.story_type === "poll" && (
            <PollCard story={currentStory} />
          )}

          {/* AI caption overlay on image/video */}
          {(currentStory.story_type === "image" || currentStory.story_type === "video") &&
            currentStory.ai_caption && (
              <div className="absolute bottom-40 left-4 right-4">
                <p className="rounded-xl bg-black/50 px-4 py-3 text-sm font-medium text-white backdrop-blur-sm leading-relaxed">
                  {currentStory.ai_caption}
                </p>
              </div>
            )}
        </motion.div>
      </AnimatePresence>

      {/* ── Bottom area ───────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 pb-safe">
        <div className="pointer-events-auto px-4 pb-8 pt-4 space-y-3">
          {/* Linked content CTA */}
          {(currentStory.linked_blog_slug || currentStory.linked_forum_slug) && (
            <a
              href={
                currentStory.linked_blog_slug
                  ? `/blog/${currentStory.linked_blog_slug}`
                  : `/forums/${currentStory.linked_forum_slug}`
              }
              className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm transition hover:bg-white/15"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-sm">
                {currentStory.linked_blog_slug ? "📄" : "💬"}
              </span>
              <div className="min-w-0">
                <p className="text-xs text-white/70">
                  {currentStory.linked_blog_slug ? "Related Article" : "Related Discussion"}
                </p>
                <p className="truncate text-sm font-semibold text-white">
                  {currentStory.linked_blog_slug ?? currentStory.linked_forum_slug}
                </p>
              </div>
              <svg
                className="ml-auto shrink-0 text-white/60"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          )}

          {/* Reply + reaction row */}
          <div className="flex items-center gap-2">
            {/* Reply input toggle */}
            {replyOpen ? (
              <div className="flex flex-1 items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void submitReply()}
                  placeholder="Reply to story…"
                  maxLength={500}
                  className="flex-1 rounded-full bg-white/15 px-4 py-2.5 text-sm text-white placeholder-white/50 outline-none backdrop-blur-sm focus:bg-white/20"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => void submitReply()}
                  className="shrink-0 rounded-full bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={() => setReplyOpen(false)}
                  className="shrink-0 rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setReplyOpen(true)}
                className="flex flex-1 items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm text-white/70 backdrop-blur-sm transition hover:bg-white/15"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Reply…
              </button>
            )}

            {/* Reaction toggle */}
            <button
              type="button"
              onClick={() => setShowReactions((s) => !s)}
              className="shrink-0 rounded-full bg-white/10 p-3 text-xl backdrop-blur-sm transition hover:bg-white/15"
              aria-label="React"
            >
              {currentStory.viewer_reaction ? reactionEmoji(currentStory.viewer_reaction) : "❤️"}
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.share) {
                  void navigator
                    .share({
                      title: `Story by ${currentStory.display_name}`,
                      text: currentStory.text ?? currentStory.ai_caption ?? "",
                      url: window.location.href,
                    })
                    .catch(() => undefined);
                }
              }}
              className="shrink-0 rounded-full bg-white/10 p-3 backdrop-blur-sm transition hover:bg-white/15"
              aria-label="Share story"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-white"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
          </div>

          {/* Reaction tray */}
          <AnimatePresence>
            {showReactions && (
              <StoryReactionTray
                currentReaction={currentStory.viewer_reaction ?? null}
                onReact={(type) => {
                  onReact?.(currentStory.id, type);
                  setShowReactions(false);
                }}
                onClose={() => setShowReactions(false)}
              />
            )}
          </AnimatePresence>

          {/* Stats */}
          <div className="flex items-center gap-4 text-[11px] text-white/55 px-1">
            <span>{currentStory.views_count} views</span>
            <span>{currentStory.reactions_count} reactions</span>
            <span>{currentStory.reply_count} replies</span>
          </div>
        </div>
      </div>

      {/* Pause indicator */}
      <AnimatePresence>
        {paused && (
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="rounded-full bg-black/40 p-4 backdrop-blur-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden>
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}

// ─── Poll card ────────────────────────────────────────────────────────────────

function PollCard({ story }: { story: Story }) {
  const [localOptions, setLocalOptions] = useState(story.poll_options);
  const [voted, setVoted] = useState(false);

  const totalVotes = localOptions.reduce((s, o) => s + o.votes, 0);

  const vote = async (index: number) => {
    if (voted) return;
    setVoted(true);
    const updated = localOptions.map((o, i) =>
      i === index ? { ...o, votes: o.votes + 1 } : o,
    );
    setLocalOptions(updated);

    await globalThis
      .fetch(`/api/stories/${story.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_index: index }),
      })
      .catch(() => undefined);
  };

  return (
    <div className="w-full max-w-sm space-y-3">
      <p className="text-center text-xl font-bold text-white">{story.poll_question}</p>
      {localOptions.map((opt, i) => {
        const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
        return (
          <button
            key={i}
            type="button"
            onClick={() => void vote(i)}
            disabled={voted}
            className="relative w-full overflow-hidden rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-left backdrop-blur-sm transition hover:bg-white/15 disabled:cursor-default"
          >
            {voted && (
              <motion.div
                className="absolute inset-y-0 left-0 bg-blue-500/30"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            )}
            <div className="relative flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{opt.text}</span>
              {voted && (
                <span className="text-sm font-bold text-white/80">{pct}%</span>
              )}
            </div>
          </button>
        );
      })}
      {voted && (
        <p className="text-center text-xs text-white/60">{totalVotes} votes</p>
      )}
    </div>
  );
}

function reactionEmoji(type: string): string {
  const map: Record<string, string> = {
    fire: "🔥",
    clap: "👏",
    insightful: "💡",
    question: "❓",
    heart: "❤️",
  };
  return map[type] ?? "❤️";
}
