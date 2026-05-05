/**
 * Turn a URL slug into title-style text, e.g. `ready-mix-concrete` → `Ready Mix Concrete`.
 */
export function humanizeHubSlug(slug: string): string {
  const s = decodeURIComponent(slug).trim();
  if (!s) return "Hub";
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
