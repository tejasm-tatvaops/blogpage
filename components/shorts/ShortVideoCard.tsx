"use client";

import { motion } from "framer-motion";
import type { VideoPost } from "@/models/VideoPost";
import { VerticalVideoPlayer } from "./VerticalVideoPlayer";
import { VideoOverlayActions } from "./VideoOverlayActions";

type ShortVideoCardProps = {
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

export function ShortVideoCard({
  post,
  index,
  isActive,
  muted,
  hasInteracted,
  liked,
  onLike,
  onMuteToggle,
  onFirstInteraction,
}: ShortVideoCardProps) {
  return (
    <div
      data-slide={index}
      className="relative h-screen w-full shrink-0 snap-start snap-always overflow-hidden"
    >
      {/* Only render inner content for active ± 1 cards to avoid memory waste */}
      {Math.abs(index - (isActive ? index : index + 1)) <= 1 || isActive ? (
        <motion.div
          className="relative h-full w-full"
          animate={{
            opacity: isActive ? 1 : 0.88,
            scale: isActive ? 1 : 0.98,
          }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Video layer */}
          <VerticalVideoPlayer
            post={post}
            isActive={isActive}
            muted={muted}
            hasInteracted={hasInteracted}
            onFirstInteraction={onFirstInteraction}
          />

          {/* Overlay actions + caption */}
          <VideoOverlayActions
            post={post}
            liked={liked}
            muted={muted}
            onLike={() => onLike(post.slug)}
            onMuteToggle={onMuteToggle}
            onFirstInteraction={onFirstInteraction}
          />
        </motion.div>
      ) : (
        /* Lazy placeholder for distant cards */
        <div className="h-full w-full bg-black" />
      )}
    </div>
  );
}
