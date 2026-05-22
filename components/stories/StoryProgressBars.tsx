"use client";

import { motion } from "framer-motion";

type Props = {
  total: number;
  currentIndex: number;
  progress: number; // 0–1 for current bar
};

export function StoryProgressBars({ total, currentIndex, progress }: Props) {
  return (
    <div className="flex w-full gap-1 px-3 pt-2">
      {Array.from({ length: total }, (_, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;
        const fill = isCompleted ? 1 : isActive ? progress : 0;

        return (
          <div
            key={i}
            className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/25"
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-white"
              initial={false}
              animate={{ width: `${fill * 100}%` }}
              transition={
                isActive
                  ? { duration: 0.05, ease: "linear" }
                  : { duration: 0.15, ease: "easeOut" }
              }
            />
          </div>
        );
      })}
    </div>
  );
}
