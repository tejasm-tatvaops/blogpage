"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SiteJournalEntryComposer } from "@/components/projects/SiteJournalEntryComposer";

export function OwnerJournalComposerLauncher({
  slug,
  currentWeek,
  currentSummary,
  showFirstNoteHint = false,
  tone = "light",
}: {
  slug: string;
  currentWeek: number;
  currentSummary?: string;
  showFirstNoteHint?: boolean;
  tone?: "light" | "dark";
}) {
  const [open, setOpen] = useState(false);
  const heading = useMemo(
    () => (showFirstNoteHint ? "Start your first field note" : `Continue Week ${currentWeek + 1} Update`),
    [currentWeek, showFirstNoteHint],
  );
  const lastUpdated = "Last updated 3 days ago";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          tone === "dark"
            ? "w-full rounded-xl border border-orange-300/40 bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-transparent px-3 py-3 text-left transition hover:from-orange-500/25 hover:via-orange-500/15"
            : "w-full rounded-xl border border-orange-200 bg-gradient-to-r from-orange-100 via-orange-50 to-white px-3 py-3 text-left transition hover:from-orange-200/80 hover:via-orange-100"
        }
      >
        <p className={tone === "dark" ? "text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-100" : "text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700"}>Continue Journal</p>
        <p className={tone === "dark" ? "mt-1 text-sm font-semibold text-white" : "mt-1 text-sm font-semibold text-slate-900"}>{heading}</p>
        <p className={tone === "dark" ? "mt-1 text-xs text-white/70" : "mt-1 text-xs text-slate-600"}>{lastUpdated}</p>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div className="fixed inset-0 z-[120]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button
              type="button"
              aria-label="Close composer"
              className="absolute inset-0 bg-black/50 backdrop-blur-md"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-4 top-4 h-[calc(100vh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-[28px] border border-app bg-surface p-4 shadow-2xl sm:p-6"
            >
              <div className="mb-4 rounded-2xl border border-app bg-subtle/50 p-4">
                <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-orange-600">Living Site Journal</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-app sm:text-3xl">{heading}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-app/80">
                    Document this week&apos;s execution reality, field observations, procurement movement, and operational decisions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-app bg-surface px-2.5 py-1 text-xs font-semibold text-app transition hover:bg-subtle"
                >
                  Close
                </button>
              </div>
              <div className="mt-4 rounded-xl border border-app bg-surface px-3 py-2 text-xs text-app/75">
                <p>Last update: Week {Math.max(1, currentWeek)} • Procurement Decision</p>
                <p className="mt-1 text-muted">From recent logs: supplier volatility was noted in earlier steel sourcing updates.</p>
              </div>
              </div>
              <SiteJournalEntryComposer
                slug={slug}
                currentWeek={currentWeek}
                currentSummary={currentSummary}
                showFirstNoteHint={showFirstNoteHint}
                variant="modal"
                onSubmitted={() => setOpen(false)}
              />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
