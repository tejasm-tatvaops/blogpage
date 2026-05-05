"use client";

import { motion } from "framer-motion";
import type { VideoPost } from "@/models/VideoPost";
import { VideoCard } from "./VideoCard";
import { ActionColumn } from "./ActionColumn";

type ShortSlideProps = {
  post: VideoPost;
  index: number;
  isActive: boolean;
  muted: boolean;
  hasInteracted: boolean;
  liked: boolean;
  onLike: (slug: string) => void;
  onMuteToggle: () => void;
  onFirstInteraction: () => void;
};

export function ShortSlide({
  post,
  index,
  isActive,
  muted,
  hasInteracted,
  liked,
  onLike,
  onMuteToggle,
  onFirstInteraction,
}: ShortSlideProps) {
  return (
    <div
      data-slide={index}
      className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden"
    >
      {Math.abs(index - (isActive ? index : index + 1)) <= 1 || isActive ? (
        <motion.div
          className="relative h-full w-full"
          animate={{ opacity: isActive ? 1 : 0.88, scale: isActive ? 1 : 0.98 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <VideoCard
            post={post}
            isActive={isActive}
            muted={muted}
            hasInteracted={hasInteracted}
            onFirstInteraction={onFirstInteraction}
          />
          <ActionColumn
            post={post}
            liked={liked}
            muted={muted}
            onLike={() => onLike(post.slug)}
            onMuteToggle={onMuteToggle}
            onFirstInteraction={onFirstInteraction}
          />
        </motion.div>
      ) : (
        <div className="h-full w-full bg-black" />
      )}
    </div>
  );
}
