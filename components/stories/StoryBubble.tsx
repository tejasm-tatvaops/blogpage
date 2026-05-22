"use client";

import { motion } from "framer-motion";
import type { Story } from "@/lib/storyService";

// Gradient ring when unseen; muted when seen
const UNSEEN_GRADIENT = "from-orange-400 via-amber-400 to-yellow-300";
const SEEN_GRADIENT = "from-surface/30 to-surface/30";

type Props = {
  story: Story | null;
  label: string;
  isViewer?: boolean;
  hasActive?: boolean;
  onClick: () => void;
};

const STORY_TYPE_BADGE: Record<string, string> = {
  poll: "Poll",
  link: "Link",
  video: "Video",
};

export function StoryBubble({ story, label, isViewer, hasActive, onClick }: Props) {
  const seen = story?.has_viewed ?? false;
  const ringGradient = seen ? SEEN_GRADIENT : UNSEEN_GRADIENT;
  const avatarUrl = story?.avatar_url ?? null;
  const initials = label.slice(0, 2).toUpperCase();
  const typeBadge = story ? STORY_TYPE_BADGE[story.story_type] : null;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-shrink-0 flex-col items-center gap-1.5 outline-none"
      style={{ width: 70 }}
    >
      {/* Ring + avatar */}
      <div
        className={`bg-gradient-to-br ${ringGradient} rounded-full p-[2.5px]`}
      >
        <div className="relative rounded-full bg-app p-[2px]">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={label}
              className="h-[52px] w-[52px] rounded-full object-cover"
            />
          ) : (
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-surface/20 text-sm font-bold text-app">
              {initials}
            </div>
          )}

          {/* Plus icon overlay for own story with no active story */}
          {isViewer && !hasActive && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white shadow">
              +
            </span>
          )}

          {/* Story type badge */}
          {typeBadge && (
            <span className="absolute -bottom-0.5 left-0 rounded-full bg-zinc-800/90 px-1.5 py-0.5 text-[8px] font-bold uppercase leading-none text-white">
              {typeBadge}
            </span>
          )}
        </div>
      </div>

      {/* Label */}
      <span className="w-full truncate text-center text-[11px] font-medium leading-tight text-app">
        {isViewer ? "Your Story" : label.split(" ")[0]}
      </span>
    </motion.button>
  );
}
