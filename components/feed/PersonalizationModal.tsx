"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TopicPreferenceSelector, type TopicState, type PreferenceMap } from "./TopicPreferenceSelector";

const TOPICS = [
  "Business",
  "Technology",
  "Startups",
  "Politics",
  "Sports",
  "International",
  "Finance",
  "Construction",
  "AI/ML",
  "Real Estate",
  "Infrastructure",
];

export const PREFS_STORAGE_KEY = "tatvaops_topic_prefs";
export const PREFS_DISMISSED_KEY = "tatvaops_prefs_dismissed";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Called after preferences are saved, with the final map */
  onSaved?: (prefs: PreferenceMap) => void;
};

export function PersonalizationModal({ isOpen, onClose, onSaved }: Props) {
  const [preferences, setPreferences] = useState<PreferenceMap>({});
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Trap focus + close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleChange = useCallback((topic: string, next: TopicState) => {
    setPreferences((prev) => ({ ...prev, [topic]: next }));
  }, []);

  // On open: try to hydrate from the server (fingerprint-linked prefs take priority
  // over localStorage so that preferences survive a localStorage clear).
  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/users/preferences", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { interested_topics?: string[]; uninterested_topics?: string[] } | null) => {
        if (!data) return;
        const serverPrefs: PreferenceMap = {};
        (data.interested_topics ?? []).forEach((t) => { serverPrefs[t] = "interested"; });
        (data.uninterested_topics ?? []).forEach((t) => { serverPrefs[t] = "uninterested"; });
        if (Object.keys(serverPrefs).length > 0) {
          setPreferences(serverPrefs);
          return;
        }
        // Fall back to localStorage if server has nothing yet
        try {
          const raw = localStorage.getItem(PREFS_STORAGE_KEY);
          if (raw) setPreferences(JSON.parse(raw) as PreferenceMap);
        } catch { /* ignore */ }
      })
      .catch(() => {
        try {
          const raw = localStorage.getItem(PREFS_STORAGE_KEY);
          if (raw) setPreferences(JSON.parse(raw) as PreferenceMap);
        } catch { /* ignore */ }
      });
  }, [isOpen]);

  const persistLocal = (prefs: PreferenceMap) => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
      localStorage.setItem(PREFS_DISMISSED_KEY, "1");
    } catch {
      // storage unavailable – proceed silently
    }
  };

  const handleContinueWithout = () => {
    persistLocal(preferences);
    onSaved?.(preferences);
    onClose();
  };

  const handleSaveWithLogin = async () => {
    setSaving(true);
    persistLocal(preferences);

    const interested_topics = Object.entries(preferences)
      .filter(([, v]) => v === "interested")
      .map(([k]) => k);
    const uninterested_topics = Object.entries(preferences)
      .filter(([, v]) => v === "uninterested")
      .map(([k]) => k);

    try {
      await fetch("/api/users/preferences", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interested_topics, uninterested_topics }),
      });
    } catch {
      // Network error — localStorage already saved, so this is non-fatal.
    }

    onSaved?.(preferences);
    setSaving(false);
    onClose();
  };

  const ratedCount = TOPICS.filter((t) => preferences[t] != null).length;
  const unratedCount = TOPICS.length - ratedCount;

  if (!isOpen) return null;

  return (
    <>
      {/* ── Backdrop ───────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* ── Sheet / Modal ──────────────────────────────────────────── */}
      {/*  Mobile  → slides up from bottom (rounded-t-2xl)            */}
      {/*  Desktop → centred overlay (sm:rounded-2xl sm:max-w-lg)     */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pref-modal-title"
      >
        <div
          ref={dialogRef}
          className="relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:max-w-lg sm:rounded-2xl"
        >
          {/* ── Close button ──────────────────────────────────────── */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* ── Drag handle (mobile only) ──────────────────────────── */}
          <div className="flex justify-center pt-3 sm:hidden">
            <div className="h-1 w-8 rounded-full bg-slate-200" />
          </div>

          {/* ── Scrollable body ───────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 pb-4 pt-5">
            {/* Header */}
            <div className="mb-6 pr-6">
              <h2
                id="pref-modal-title"
                className="text-xl font-bold tracking-tight text-app"
              >
                Personalize Your Feed
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                Select topics to improve your recommendations.
              </p>
            </div>

            {/* Topic selector */}
            <TopicPreferenceSelector
              topics={TOPICS}
              preferences={preferences}
              onChange={handleChange}
            />

            {/* Soft prompt for unrated topics */}
            {unratedCount > 0 && ratedCount > 0 && (
              <p className="mt-5 text-xs text-slate-400">
                Rate {unratedCount} more topic{unratedCount !== 1 ? "s" : ""} to sharpen
                your recommendations.
              </p>
            )}
            {ratedCount === 0 && (
              <p className="mt-5 text-xs text-slate-400">
                Tap 👍 or 👎 on any topic above to get started.
              </p>
            )}
          </div>

          {/* ── Footer ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-2.5 border-t border-slate-100 px-6 py-4 sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSaveWithLogin}
              disabled={saving}
              className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60 sm:flex-none"
            >
              {saving ? "Saving…" : "Login & Save Preferences"}
            </button>
            <button
              type="button"
              onClick={handleContinueWithout}
              className="flex-1 rounded-lg border border-app bg-surface px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-subtle sm:flex-none"
            >
              Continue Without Login
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
