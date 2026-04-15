import { NextRequest, NextResponse } from "next/server";

// ── Colour themes keyed by keyword ─────────────────────────────────────────
type Theme = { from: string; mid: string; to: string; accent: string; text: string };

const THEMES: Record<string, Theme> = {
  // BOQ / Estimation / Quantity
  boq:        { from: "#92400e", mid: "#b45309", to: "#78350f", accent: "#fcd34d", text: "#fef3c7" },
  estimat:    { from: "#92400e", mid: "#b45309", to: "#78350f", accent: "#fcd34d", text: "#fef3c7" },
  quantity:   { from: "#92400e", mid: "#b45309", to: "#78350f", accent: "#fcd34d", text: "#fef3c7" },
  takeoff:    { from: "#92400e", mid: "#b45309", to: "#78350f", accent: "#fcd34d", text: "#fef3c7" },
  // Technology / Software / Digital
  tech:       { from: "#1e3a8a", mid: "#1d4ed8", to: "#1e40af", accent: "#93c5fd", text: "#dbeafe" },
  software:   { from: "#1e3a8a", mid: "#1d4ed8", to: "#1e40af", accent: "#93c5fd", text: "#dbeafe" },
  digital:    { from: "#1e3a8a", mid: "#1d4ed8", to: "#1e40af", accent: "#93c5fd", text: "#dbeafe" },
  platform:   { from: "#1e3a8a", mid: "#1d4ed8", to: "#1e40af", accent: "#93c5fd", text: "#dbeafe" },
  app:        { from: "#1e3a8a", mid: "#1d4ed8", to: "#1e40af", accent: "#93c5fd", text: "#dbeafe" },
  saas:       { from: "#1e3a8a", mid: "#1d4ed8", to: "#1e40af", accent: "#93c5fd", text: "#dbeafe" },
  // Vendor / Procurement / Supply chain
  vendor:     { from: "#064e3b", mid: "#065f46", to: "#047857", accent: "#6ee7b7", text: "#d1fae5" },
  procure:    { from: "#064e3b", mid: "#065f46", to: "#047857", accent: "#6ee7b7", text: "#d1fae5" },
  supplier:   { from: "#064e3b", mid: "#065f46", to: "#047857", accent: "#6ee7b7", text: "#d1fae5" },
  supply:     { from: "#064e3b", mid: "#065f46", to: "#047857", accent: "#6ee7b7", text: "#d1fae5" },
  // Finance / Cost / Billing
  financ:     { from: "#164e63", mid: "#0e7490", to: "#0c4a6e", accent: "#67e8f9", text: "#cffafe" },
  cost:       { from: "#164e63", mid: "#0e7490", to: "#0c4a6e", accent: "#67e8f9", text: "#cffafe" },
  bill:       { from: "#164e63", mid: "#0e7490", to: "#0c4a6e", accent: "#67e8f9", text: "#cffafe" },
  budget:     { from: "#164e63", mid: "#0e7490", to: "#0c4a6e", accent: "#67e8f9", text: "#cffafe" },
  payment:    { from: "#164e63", mid: "#0e7490", to: "#0c4a6e", accent: "#67e8f9", text: "#cffafe" },
  invoice:    { from: "#164e63", mid: "#0e7490", to: "#0c4a6e", accent: "#67e8f9", text: "#cffafe" },
  // Project / Management
  project:    { from: "#4c1d95", mid: "#6d28d9", to: "#5b21b6", accent: "#c4b5fd", text: "#ede9fe" },
  manage:     { from: "#4c1d95", mid: "#6d28d9", to: "#5b21b6", accent: "#c4b5fd", text: "#ede9fe" },
  workflow:   { from: "#4c1d95", mid: "#6d28d9", to: "#5b21b6", accent: "#c4b5fd", text: "#ede9fe" },
  // Construction / Building / Site
  construct:  { from: "#1c1917", mid: "#292524", to: "#44403c", accent: "#fbbf24", text: "#fef3c7" },
  building:   { from: "#1c1917", mid: "#292524", to: "#44403c", accent: "#fbbf24", text: "#fef3c7" },
  site:       { from: "#1c1917", mid: "#292524", to: "#44403c", accent: "#fbbf24", text: "#fef3c7" },
  civil:      { from: "#1c1917", mid: "#292524", to: "#44403c", accent: "#fbbf24", text: "#fef3c7" },
  infra:      { from: "#1c1917", mid: "#292524", to: "#44403c", accent: "#fbbf24", text: "#fef3c7" },
  // Compliance / Regulation / Legal
  complian:   { from: "#1e3a5f", mid: "#1e3a8a", to: "#172554", accent: "#a5f3fc", text: "#ecfeff" },
  regulat:    { from: "#1e3a5f", mid: "#1e3a8a", to: "#172554", accent: "#a5f3fc", text: "#ecfeff" },
  legal:      { from: "#1e3a5f", mid: "#1e3a8a", to: "#172554", accent: "#a5f3fc", text: "#ecfeff" },
};

const DEFAULT_THEME: Theme = {
  from: "#0c4a6e",
  mid: "#0369a1",
  to: "#075985",
  accent: "#38bdf8",
  text: "#e0f2fe",
};

function resolveTheme(category: string, tags: string[]): Theme {
  const haystack = [category, ...tags]
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ");

  for (const [key, theme] of Object.entries(THEMES)) {
    if (haystack.includes(key)) return theme;
  }
  return DEFAULT_THEME;
}

// ── Text wrapping ───────────────────────────────────────────────────────────
function wrapTitle(text: string, maxChars = 28): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === 2) {
        // Truncate remaining text into the 3rd line
        const remaining = words.slice(words.indexOf(word)).join(" ");
        const truncated =
          remaining.length > maxChars
            ? `${remaining.slice(0, maxChars - 1).trimEnd()}…`
            : remaining;
        lines.push(truncated);
        return lines;
      }
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

// ── XML-safe escaping ───────────────────────────────────────────────────────
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── SVG builder ─────────────────────────────────────────────────────────────
function buildSvg(title: string, category: string, tags: string[]): string {
  const theme = resolveTheme(category, tags);
  const lines = wrapTitle(title, 28);

  // Title block: vertically centred in the bottom 55% of the canvas
  const FONT_SIZE = 74;
  const LINE_HEIGHT = 92;
  const blockH = lines.length * LINE_HEIGHT;
  const blockStartY = 900 * 0.42 + (900 * 0.45 - blockH) / 2 + FONT_SIZE;

  const titleSvg = lines
    .map(
      (line, i) =>
        `<text x="100" y="${Math.round(blockStartY + i * LINE_HEIGHT)}" ` +
        `font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" ` +
        `font-size="${FONT_SIZE}" font-weight="800" fill="${theme.text}" ` +
        `letter-spacing="-1">${esc(line)}</text>`,
    )
    .join("\n  ");

  // Category badge width: rough 18px per char + 56px padding
  const catLabel = category ? category.toUpperCase() : "BLOG";
  const badgeW = Math.min(catLabel.length * 18 + 56, 580);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
      <stop offset="0%"   stop-color="${theme.from}"/>
      <stop offset="50%"  stop-color="${theme.mid}"/>
      <stop offset="100%" stop-color="${theme.to}"/>
    </linearGradient>
    <!-- subtle grid overlay -->
    <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
      <path d="M64 0 L0 0 0 64" fill="none" stroke="white" stroke-width="0.6" stroke-opacity="0.07"/>
    </pattern>
    <!-- bottom fade -->
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="transparent"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.45)"/>
    </linearGradient>
  </defs>

  <!-- Background layers -->
  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect width="1600" height="900" fill="url(#grid)"/>
  <rect width="1600" height="900" fill="url(#fade)"/>

  <!-- Decorative circles (top-right cluster) -->
  <circle cx="1480" cy="120" r="320" fill="${theme.accent}" fill-opacity="0.07"/>
  <circle cx="1550" cy="60"  r="190" fill="${theme.accent}" fill-opacity="0.06"/>
  <circle cx="1380" cy="200" r="120" fill="${theme.accent}" fill-opacity="0.05"/>
  <!-- Bottom-left accent -->
  <circle cx="80"  cy="820" r="180" fill="${theme.accent}" fill-opacity="0.05"/>

  <!-- Accent bar under category -->
  <rect x="100" y="282" width="72" height="7" rx="3.5" fill="${theme.accent}"/>

  <!-- Category badge -->
  <rect x="100" y="200" width="${badgeW}" height="56" rx="28"
        fill="${theme.accent}" fill-opacity="0.18"
        stroke="${theme.accent}" stroke-opacity="0.35" stroke-width="1.5"/>
  <text x="128" y="238"
        font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"
        font-size="24" font-weight="700" fill="${theme.accent}"
        letter-spacing="2">${esc(catLabel)}</text>

  <!-- Blog title -->
  ${titleSvg}

  <!-- TatvaOps brand -->
  <text x="100" y="858"
        font-family="system-ui,-apple-system,'Segoe UI',Roboto,sans-serif"
        font-size="26" font-weight="600" fill="white" fill-opacity="0.45"
        letter-spacing="1">tatvaops.com</text>
</svg>`;
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title    = (searchParams.get("title")    ?? "TatvaOps Blog").slice(0, 150);
  const category = (searchParams.get("category") ?? "Construction Tech").slice(0, 80);
  const tagsRaw  = (searchParams.get("tags")     ?? "").slice(0, 200);
  const tags     = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const svg = buildSvg(title, category, tags);

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
