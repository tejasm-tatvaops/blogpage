"use client";

/**
 * useTheme — time-of-day aware theme with persistent user override.
 *
 * Auto-selection rules:
 *   06:00 – 18:59  → light
 *   19:00 – 05:59  → dark
 *
 * User override persists in localStorage under "tatvaops_theme".
 * Clearing the override ("auto") restores time-based switching.
 *
 * Returns:
 *   theme        — effective theme being applied ("light" | "dark")
 *   preference   — raw stored preference ("light" | "dark" | "auto")
 *   setPreference — persist a new choice (or "auto" to clear override)
 */

import { useCallback, useEffect, useState } from "react";

export type ThemeValue = "light" | "dark";
export type ThemePreference = ThemeValue | "auto";

const STORAGE_KEY = "tatvaops_theme";
const DAYTIME_START = 6;   // 06:00 inclusive
const DAYTIME_END   = 19;  // 19:00 exclusive (i.e., until 18:59)

function getAutoTheme(): ThemeValue {
  const hour = new Date().getHours();
  return hour >= DAYTIME_START && hour < DAYTIME_END ? "light" : "dark";
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "auto";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
  } catch {
    // localStorage unavailable (e.g., private-mode restrictions)
  }
  return "auto";
}

function applyTheme(theme: ThemeValue) {
  document.documentElement.setAttribute("data-theme", theme);
  // Also update <meta name="color-scheme"> for scrollbar/native UI
  let meta = document.querySelector<HTMLMetaElement>("meta[name='color-scheme']");
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "color-scheme";
    document.head.appendChild(meta);
  }
  meta.content = theme;
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>("auto");
  const [theme, setTheme] = useState<ThemeValue>("light");

  // Derive effective theme from preference
  const resolveTheme = useCallback((pref: ThemePreference): ThemeValue => {
    return pref === "auto" ? getAutoTheme() : pref;
  }, []);

  // Initial hydration — read stored preference and apply
  useEffect(() => {
    const stored = readStoredPreference();
    setPreferenceState(stored);
    const effective = resolveTheme(stored);
    setTheme(effective);
    applyTheme(effective);
  }, [resolveTheme]);

  // When preference is "auto", re-check every minute so theme flips at boundary
  useEffect(() => {
    if (preference !== "auto") return;

    const tick = () => {
      const effective = getAutoTheme();
      setTheme(effective);
      applyTheme(effective);
    };

    // Align interval to the next minute boundary for accurate flip timing
    const msUntilNextMinute = 60_000 - (Date.now() % 60_000);
    const timeout = setTimeout(() => {
      tick();
      const interval = setInterval(tick, 60_000);
      return () => clearInterval(interval);
    }, msUntilNextMinute);

    return () => clearTimeout(timeout);
  }, [preference]);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      setPreferenceState(next);
      try {
        if (next === "auto") {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          localStorage.setItem(STORAGE_KEY, next);
        }
      } catch {
        // Ignore write failures
      }
      const effective = resolveTheme(next);
      setTheme(effective);
      applyTheme(effective);
    },
    [resolveTheme],
  );

  return { theme, preference, setPreference };
}
