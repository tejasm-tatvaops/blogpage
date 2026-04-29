"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { getTutorialVideoSource } from "@/lib/tutorialVideo";

export type VideoPlayerHandle = {
  seekTo: (seconds: number) => void;
};

type VideoPlayerProps = {
  sourceUrl: string;
  title: string;
  onTimeUpdate?: (seconds: number) => void;
};

function getYoutubeEmbedId(embedUrl: string): string | null {
  const match = embedUrl.match(/\/embed\/([^?&/]+)/);
  return match?.[1] ?? null;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
  { sourceUrl, title, onTimeUpdate },
  ref,
) {
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const youtubeFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekSeconds, setSeekSeconds] = useState(0);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [youtubeStart, setYoutubeStart] = useState(0);

  const source = useMemo(() => getTutorialVideoSource(sourceUrl), [sourceUrl]);
  const youtubeId = source.kind === "youtube" ? getYoutubeEmbedId(source.url) : null;

  useImperativeHandle(ref, () => ({
    seekTo(seconds: number) {
      const safeTime = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
      setSeekSeconds(safeTime);
      if (source.kind === "direct" && videoElementRef.current) {
        videoElementRef.current.currentTime = safeTime;
        setCurrentSeconds(safeTime);
      }
      if (source.kind === "youtube") {
        setYoutubeStart(safeTime);
        youtubeFrameRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "seekTo", args: [safeTime, true] }),
          "*",
        );
      }
    },
  }), [source.kind]);

  useEffect(() => {
    setSeekSeconds(0);
    setCurrentSeconds(0);
    setDuration(0);
    setYoutubeStart(0);
    setIsPlaying(false);
  }, [sourceUrl]);

  const togglePlayPause = () => {
    if (source.kind === "direct" && videoElementRef.current) {
      if (videoElementRef.current.paused) {
        void videoElementRef.current.play();
      } else {
        videoElementRef.current.pause();
      }
      return;
    }
  };

  const seekToValue = (seconds: number) => {
    const safe = Math.max(0, seconds);
    setSeekSeconds(safe);
    if (source.kind === "direct" && videoElementRef.current) {
      videoElementRef.current.currentTime = safe;
    }
    if (source.kind === "youtube") {
      setYoutubeStart(safe);
    }
  };

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-app bg-surface shadow-sm">
      <div className="bg-black">
        {source.kind === "youtube" ? (
          <iframe
            ref={youtubeFrameRef}
            src={`https://www.youtube.com/embed/${youtubeId ?? ""}?rel=0&modestbranding=1&enablejsapi=1&start=${Math.floor(youtubeStart)}`}
            title={`${title} video`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full"
          />
        ) : (
          <video
            ref={videoElementRef}
            src={source.url}
            controls
            playsInline
            preload="metadata"
            className="w-full"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
            onTimeUpdate={(event) => {
              const seconds = event.currentTarget.currentTime || 0;
              setCurrentSeconds(seconds);
              setSeekSeconds(seconds);
              onTimeUpdate?.(seconds);
            }}
          />
        )}
      </div>
      {source.kind === "direct" && (
        <div className="flex items-center gap-3 border-t border-app px-4 py-3">
          <button
            type="button"
            onClick={togglePlayPause}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(duration || seekSeconds || 1, 1)}
            value={seekSeconds}
            onChange={(event) => {
              const val = Number(event.target.value);
              seekToValue(val);
              setCurrentSeconds(val);
            }}
            className="h-2 w-full cursor-pointer rounded-lg accent-sky-500"
          />
          <span className="text-xs text-slate-500">{Math.floor(currentSeconds)}s</span>
        </div>
      )}
    </section>
  );
});
