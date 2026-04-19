"use client";

import { useTheme, type ThemePreference } from "@/hooks/useTheme";

/** Sun icon for light mode */
const IconSun = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

/** Moon icon for dark mode */
const IconMoon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/** Auto (clock) icon for system-auto mode */
const IconAuto = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const CYCLE: ThemePreference[] = ["auto", "light", "dark"];

const LABELS: Record<ThemePreference, string> = {
  auto:  "Auto (time-of-day)",
  light: "Light",
  dark:  "Dark",
};

/**
 * Cycles: auto → light → dark → auto
 * Auto restores time-of-day logic; stored preference always wins.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  const handleClick = () => {
    const idx = CYCLE.indexOf(preference);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    setPreference(next);
  };

  const icon =
    preference === "light" ? <IconSun /> :
    preference === "dark"  ? <IconMoon /> :
    <IconAuto />;

  return (
    <button
      type="button"
      onClick={handleClick}
      title={`Theme: ${LABELS[preference]}. Click to cycle.`}
      aria-label={`Current theme: ${LABELS[preference]}. Click to change.`}
      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 hover:shadow"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-pill-bg)",
        color: "var(--color-pill-text)",
      }}
    >
      {icon}
    </button>
  );
}
