/**
 * Content Structure Checker — fast, pure (no I/O, no AI).
 *
 * Validates that markdown blog content meets structural SEO requirements:
 *   - Exactly one H1
 *   - At least two H2 or H3 sections
 *   - No paragraph longer than MAX_PARAGRAPH_WORDS words
 *   - Body text word count within expected range
 *
 * Use this before saving a blog post to surface issues early.
 *
 * Example:
 *   const report = checkContentStructure({ title, content });
 *   if (!report.valid) console.warn(report.warnings);
 */

const MAX_PARAGRAPH_WORDS = 120;
const MIN_BODY_WORDS = 300;

export type StructureWarning = {
  code:
    | "MISSING_H1"
    | "MULTIPLE_H1"
    | "MISSING_SECTIONS"
    | "LONG_PARAGRAPH"
    | "TOO_SHORT"
    | "TITLE_H1_MISMATCH";
  message: string;
};

export type StructureReport = {
  valid: boolean;               // no warnings at all
  warnings: StructureWarning[];
  h1Count: number;
  h2Count: number;
  h3Count: number;
  paragraphCount: number;
  longestParagraphWords: number;
  wordCount: number;
};

const countParagraphWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

/**
 * Counts body prose words (strips markdown syntax so the count reflects
 * what readers actually see).
 */
const countBodyWords = (markdown: string): number =>
  markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[#>*_\-[\]()!|]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

export function checkContentStructure(input: {
  title: string;
  content: string;
}): StructureReport {
  const { title, content } = input;
  const warnings: StructureWarning[] = [];
  const lines = content.split("\n");

  // ── Heading analysis ──────────────────────────────────────────────────────

  let h1Count = 0;
  let h2Count = 0;
  let h3Count = 0;
  let firstH1Text = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#\s+/.test(trimmed)) {
      h1Count++;
      if (h1Count === 1) firstH1Text = trimmed.replace(/^#\s+/, "");
    } else if (/^##\s+/.test(trimmed)) {
      h2Count++;
    } else if (/^###\s+/.test(trimmed)) {
      h3Count++;
    }
  }

  if (h1Count === 0) {
    warnings.push({ code: "MISSING_H1", message: "Content has no H1 heading (# Title)." });
  }
  if (h1Count > 1) {
    warnings.push({
      code: "MULTIPLE_H1",
      message: `Content has ${h1Count} H1 headings — only one is recommended for SEO.`,
    });
  }
  if (h1Count === 1 && title && firstH1Text.toLowerCase() !== title.toLowerCase()) {
    warnings.push({
      code: "TITLE_H1_MISMATCH",
      message: `H1 "${firstH1Text}" does not match post title "${title}". Consider aligning them for SEO.`,
    });
  }
  if (h2Count + h3Count < 2) {
    warnings.push({
      code: "MISSING_SECTIONS",
      message: `Content has only ${h2Count + h3Count} subheading(s). Add at least 2 H2/H3 sections to improve scannability.`,
    });
  }

  // ── Paragraph analysis ────────────────────────────────────────────────────

  // Split on blank lines to get paragraphs, skip headings and code blocks
  const rawBlocks = content.split(/\n{2,}/);
  const paragraphs = rawBlocks.filter((block) => {
    const t = block.trim();
    // skip headings, code fences, list-only blocks
    if (/^#{1,6}\s/.test(t)) return false;
    if (t.startsWith("```")) return false;
    if (/^[-*+]\s/.test(t)) return false;
    return t.length > 0;
  });

  let longestParagraphWords = 0;
  for (const para of paragraphs) {
    const wc = countParagraphWords(para.replace(/[*_`#>]/g, " "));
    if (wc > longestParagraphWords) longestParagraphWords = wc;
    if (wc > MAX_PARAGRAPH_WORDS) {
      warnings.push({
        code: "LONG_PARAGRAPH",
        message: `A paragraph is ${wc} words long. Break it up — paragraphs over ${MAX_PARAGRAPH_WORDS} words hurt readability.`,
      });
      break; // only report once per check to avoid noise
    }
  }

  // ── Word count ────────────────────────────────────────────────────────────

  const wordCount = countBodyWords(content);
  if (wordCount < MIN_BODY_WORDS) {
    warnings.push({
      code: "TOO_SHORT",
      message: `Content is ${wordCount} words. Aim for at least ${MIN_BODY_WORDS} words for meaningful SEO coverage.`,
    });
  }

  return {
    valid: warnings.length === 0,
    warnings,
    h1Count,
    h2Count,
    h3Count,
    paragraphCount: paragraphs.length,
    longestParagraphWords,
    wordCount,
  };
}

/**
 * Returns a plain-text summary of the structure warnings, suitable for
 * logging, admin UI hints, or AI feedback prompts.
 */
export function formatStructureWarnings(report: StructureReport): string {
  if (report.valid) return "Content structure: OK";
  return [
    `Content structure issues (${report.warnings.length}):`,
    ...report.warnings.map((w) => `  [${w.code}] ${w.message}`),
  ].join("\n");
}
