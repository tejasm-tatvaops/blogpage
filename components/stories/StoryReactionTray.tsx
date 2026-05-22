"use client";

import { motion } from "framer-motion";
import type { StoryReactionType } from "@/models/StoryReaction";

const REACTIONS: { type: StoryReactionType; emoji: string; label: string }[] = [
  { type: "fire", emoji: "🔥", label: "Fire" },
  { type: "clap", emoji: "👏", label: "Clap" },
  { type: "insightful", emoji: "💡", label: "Insightful" },
  { type: "question", emoji: "❓", label: "Question" },
  { type: "heart", emoji: "❤️", label: "Heart" },
];

type Props = {
  currentReaction: string | null;
  onReact: (type: StoryReactionType) => void;
  onClose: () => void;
};

export function StoryReactionTray({ currentReaction, onReact }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.92 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-center gap-2 rounded-2xl bg-black/60 px-4 py-3 backdrop-blur-md"
    >
      {REACTIONS.map(({ type, emoji, label }) => {
        const isActive = currentReaction === type;
        return (
          <motion.button
            key={type}
            type="button"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.88 }}
            animate={isActive ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
            onClick={() => onReact(type)}
            title={label}
            className={`flex flex-col items-center gap-0.5 rounded-xl p-2 transition ${
              isActive ? "bg-white/20 ring-2 ring-white/40" : "hover:bg-white/10"
            }`}
          >
            <span className="text-2xl leading-none" role="img" aria-label={label}>
              {emoji}
            </span>
            <span className="text-[9px] font-medium text-white/70">{label}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
