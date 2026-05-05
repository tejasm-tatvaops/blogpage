"use client";

import { ReactNode } from "react";

type ShortsPageProps = {
  topBar: ReactNode;
  feed: ReactNode;
  dots?: ReactNode;
  overlays?: ReactNode;
};

export function ShortsPage({ topBar, feed, dots, overlays }: ShortsPageProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0c12] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute left-[20%] top-0 h-full w-px bg-gradient-to-b from-transparent via-sky-300/15 to-transparent" />
        <div className="absolute left-[55%] top-0 h-full w-px bg-gradient-to-b from-transparent via-violet-300/15 to-transparent" />
      </div>

      {topBar}

      <div className="fixed bottom-0 left-0 right-0 top-20 md:left-32">
        {feed}
      </div>

      {dots}
      {overlays}
    </div>
  );
}
