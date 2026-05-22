/** Theme-aware button / chip class strings (pair with globals.css ui-* components). */

export const btnPrimary =
  "ui-btn ui-btn-primary rounded-xl px-4 py-2 text-sm font-semibold shadow-sm disabled:cursor-not-allowed disabled:opacity-50";

export const btnPrimarySm =
  "ui-btn ui-btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "ui-btn ui-btn-secondary rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";

export const btnGhost =
  "ui-btn ui-btn-ghost rounded-xl px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";

export const btnGhostSm =
  "ui-btn ui-btn-ghost rounded-lg px-3 py-1.5 text-xs font-medium uppercase tracking-wide";

export const chip =
  "ui-chip rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50";

export const chipSm =
  "ui-chip rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition";

export const chipActive = `${chip} ui-chip-active`;

export const chipActiveSm = `${chipSm} ui-chip-active`;

export function chipToggle(active: boolean): string {
  return active ? chipActive : chip;
}

export function chipToggleSm(active: boolean): string {
  return active ? chipActiveSm : chipSm;
}

export const fieldInput =
  "ui-input w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:ring-2 ring-focus disabled:opacity-50";
