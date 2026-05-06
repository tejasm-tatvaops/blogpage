"use client";

import { motion } from "framer-motion";

type ContextChipProps = {
  text: string;
  keyword?: string | null;
  className?: string;
};

export function ContextChip({ text, keyword, className }: ContextChipProps) {
  if (!text.trim()) return null;

  const normalizedKeyword = (keyword ?? "").trim();
  const keywordRegex = normalizedKeyword
    ? new RegExp(`(${normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig")
    : null;

  const parts = keywordRegex ? text.split(keywordRegex) : [text];

  return (
    <motion.span
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className={`inline-flex max-w-full items-center rounded-full border border-black/10 bg-black/[0.03] px-2.5 py-1 text-[11px] text-slate-600 backdrop-blur transition duration-200 hover:text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-white/55 dark:hover:text-white/80 ${className ?? ""}`}
    >
      <span className="truncate">
        {parts.map((part, index) => {
          const isKeyword =
            Boolean(keywordRegex) && normalizedKeyword.length > 0 && part.toLowerCase() === normalizedKeyword.toLowerCase();
          return (
            <span key={`${part}-${index}`} className={isKeyword ? "font-semibold text-orange-600 dark:text-orange-300" : undefined}>
              {part}
            </span>
          );
        })}
      </span>
    </motion.span>
  );
}
