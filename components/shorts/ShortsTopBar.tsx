"use client";

import Link from "next/link";

type ShortsTopBarProps = {
  activeIndex: number;
  total: number;
};

export function ShortsTopBar({ activeIndex, total }: ShortsTopBarProps) {
  return (
    <div className="fixed left-0 right-0 top-20 z-30 md:left-32">
      <div className="px-4 md:px-5">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-white/80 backdrop-blur-md">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/90 transition hover:bg-white/20"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
            Back
          </Link>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
            Shorts {activeIndex + 1}/{total}
          </span>
        </div>
      </div>
    </div>
  );
}
