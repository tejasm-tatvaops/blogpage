"use client";

import type { VideoPost } from "@/models/VideoPost";
import { VerticalVideoPlayer } from "./VerticalVideoPlayer";

type VideoCardProps = {
  post: VideoPost;
  isActive: boolean;
  muted: boolean;
  hasInteracted: boolean;
  onFirstInteraction: () => void;
};

export function VideoCard({
  post,
  isActive,
  muted,
  hasInteracted,
  onFirstInteraction,
}: VideoCardProps) {
  return (
    <div className="relative flex h-full items-end justify-center px-3 pb-4 md:px-4 md:pb-5">
      <div className="h-full w-full max-w-[420px] overflow-hidden rounded-2xl">
      <VerticalVideoPlayer
        post={post}
        isActive={isActive}
        muted={muted}
        hasInteracted={hasInteracted}
        onFirstInteraction={onFirstInteraction}
      />
      </div>
    </div>
  );
}
