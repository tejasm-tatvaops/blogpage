"use client";

import { useEffect, useRef, useState } from "react";

export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const updateProgress = () => {
      const stopEl = document.getElementById("knowledge-ecosystem-section");
      const scrollTop = window.scrollY;

      let scrollHeight: number;
      if (stopEl) {
        scrollHeight = stopEl.getBoundingClientRect().top + scrollTop;
      } else {
        scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      }

      if (scrollHeight <= 0) {
        setProgress((prev) => (prev === 0 ? prev : 0));
        return;
      }

      const next = Math.round(Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)));
      setProgress((prev) => (prev === next ? prev : next));
    };

    const onScroll = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        updateProgress();
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px]">
      <div
        className="h-full bg-sky-500 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
