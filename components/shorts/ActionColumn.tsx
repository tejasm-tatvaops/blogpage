"use client";

import type { VideoPost } from "@/models/VideoPost";
import { VideoOverlayActions } from "./VideoOverlayActions";

type ActionColumnProps = {
  post: VideoPost;
  liked: boolean;
  muted: boolean;
  onLike: () => void;
  onMuteToggle: () => void;
  onFirstInteraction: () => void;
};

export function ActionColumn({
  post,
  liked,
  muted,
  onLike,
  onMuteToggle,
  onFirstInteraction,
}: ActionColumnProps) {
  return (
    <VideoOverlayActions
      post={post}
      liked={liked}
      muted={muted}
      onLike={onLike}
      onMuteToggle={onMuteToggle}
      onFirstInteraction={onFirstInteraction}
    />
  );
}
