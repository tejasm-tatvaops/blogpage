/**
 * Keyword Extractor — pure function, no I/O.
 *
 * Derives the primary keyword phrase, tag-based secondary keywords, and
 * heading-extracted keyword variations from a post's title, tags, and
 * markdown content. Used for SEO validation and meta description checks.
 */

export type KeywordSet = {
  primary: string;     // Main keyword phrase (derived from title)
  secondary: string[]; // Tag-based keywords
  headings: string[];  // Keyword phrases extracted from H2/H3 headings
  all: string[];       // Deduplicated union of all of the above
};

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "can", "how", "what", "when", "where",
  "why", "which", "who", "that", "this", "these", "those", "it", "its",
  "not", "no", "nor", "so", "yet", "both", "either", "neither", "each",
  "few", "more", "most", "other", "some", "such", "than", "too", "very",
  "just", "about", "above", "after", "before", "between", "during", "into",
  "through", "under", "while", "per", "up", "out",
]);

/**
 * Extract 2–3 meaningful words from a title as the primary keyword phrase.
 * Strips stop words and punctuation; takes the first 3 meaningful tokens.
 */
function extractPrimaryKeyword(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return words.slice(0, 3).join(" ");
}

/**
 * Extract keyword phrases from H2/H3 headings in markdown content.
 * Returns one short phrase per heading (up to 4 meaningful words each).
 */
function extractHeadingKeywords(content: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const line of content.split("\n")) {
    const match = line.match(/^#{2,3}\s+(.+)$/);
    if (!match) continue;

    const phrase = match[1]
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
      .slice(0, 4)
      .join(" ");

    if (phrase && !seen.has(phrase)) {
      seen.add(phrase);
      results.push(phrase);
    }
    if (results.length >= 8) break;
  }

  return results;
}

export function extractKeywords(input: {
  title: string;
  tags: string[];
  content: string;
}): KeywordSet {
  const primary = extractPrimaryKeyword(input.title);
  const secondary = input.tags
    .map((t) => t.toLowerCase().trim())
    .filter((t) => t.length >= 2);
  const headings = extractHeadingKeywords(input.content);

  const all = [...new Set([primary, ...secondary, ...headings])].filter(Boolean);

  return { primary, secondary, headings, all };
}

/**
 * Returns true when the meta description naturally contains the primary keyword
 * (at minimum the first meaningful word of the primary phrase).
 */
export function descriptionHasKeyword(description: string, primary: string): boolean {
  if (!primary) return true;
  const firstWord = primary.split(" ")[0];
  return description.toLowerCase().includes(firstWord);
}
