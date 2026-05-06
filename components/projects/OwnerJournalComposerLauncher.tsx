"use client";

import { useMemo, useState } from "react";
import { SiteJournalEntryComposer } from "@/components/projects/SiteJournalEntryComposer";

export function OwnerJournalComposerLauncher({
  slug,
  currentWeek,
  currentSummary,
  showFirstNoteHint = false,
}: {
  slug: string;
  currentWeek: number;
  currentSummary?: string;
  showFirstNoteHint?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const heading = useMemo(
    () => (showFirstNoteHint ? "Start your first field note" : `Continue Week ${currentWeek + 1} Update`),
    [currentWeek, showFirstNoteHint],
  );
  const lastUpdated = useMemo(
    () => "Last updated 3 days ago",
    [currentWeek],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-orange-300/40 bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent px-3 py-3 text-left transition hover:from-orange-500/25 hover:via-orange-500/15"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-100">Continue Journal</p>
        <p className="mt-1 text-sm font-semibold text-white">{heading}</p>
        <p className="mt-1 text-xs text-white/70">{lastUpdated}</p>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[90]">
          <button
            type="button"
            aria-label="Close composer"
            className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-white/10 bg-slate-950/95 p-4 shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-orange-300">Living Site Journal</p>
                <h3 className="mt-1 text-xl font-semibold text-white">{heading}</h3>
                <p className="mt-1 text-sm text-white/70">What changed on site this week?</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
            <SiteJournalEntryComposer
              slug={slug}
              currentWeek={currentWeek}
              currentSummary={currentSummary}
              showFirstNoteHint={showFirstNoteHint}
              variant="modal"
              onSubmitted={() => setOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
