/**
 * Auto Internal Linking Engine
 *
 * Scans markdown content for keywords that match existing post titles/tags,
 * then injects markdown hyperlinks — max MAX_LINKS per run, no duplicate links.
 *
 * Strategy:
 *  1. Fetch all published post summaries (slug + title + tags).
 *  2. Build a sorted keyword map: longer phrases first (greedy, avoids partial matches).
 *  3. Scan the main content (skipping code fences, headings, and existing links).
 *  4. Insert [keyword](/blog/slug) for each match, up to MAX_LINKS.
 */

import { getAllPostSummaries, type PostSummary } from "./blogService";

const MAX_LINKS = 7;
const MIN_KEYWORD_LENGTH = 4;

export type InternalLinkResult = {
  content: string;       // Modified markdown
  linksAdded: number;    // How many links were injected
  linkMap: Array<{ keyword: string; slug: string }>; // What was linked
};

// ── Build keyword → slug map ─────────────────────────────────────────────────

function buildKeywordMap(
  posts: PostSummary[],
  excludeSlug?: string,
): Map<string, string> {
  const map = new Map<string, string>();

  for (const post of posts) {
    if (post.slug === excludeSlug) continue;

    // Title as keyword
    const titleKw = post.title.trim();
    if (titleKw.length >= MIN_KEYWORD_LENGTH) {
      map.set(titleKw.toLowerCase(), post.slug);
    }

    // Tags as keywords
    for (const tag of post.tags) {
      const tagKw = tag.trim();
      if (tagKw.length >= MIN_KEYWORD_LENGTH) {
        map.set(tagKw.toLowerCase(), post.slug);
      }
    }
  }

  // Sort by keyword length descending so longer phrases match first
  return new Map([...map.entries()].sort((a, b) => b[0].length - a[0].length));
}

// ── Segment markdown to skip protected regions ───────────────────────────────

type Segment = { text: string; protected: boolean };

function segmentMarkdown(markdown: string): Segment[] {
  const segments: Segment[] = [];

  // Patterns to protect: code fences, inline code, headings, existing links, images
  const protectedPattern =
    /```[\s\S]*?```|`[^`]+`|^#{1,6}\s.+$/gm;

  let lastIndex = 0;
  for (const match of markdown.matchAll(protectedPattern)) {
    if (match.index! > lastIndex) {
      segments.push({ text: markdown.slice(lastIndex, match.index), protected: false });
    }
    segments.push({ text: match[0], protected: true });
    lastIndex = match.index! + match[0].length;
  }
  if (lastIndex < markdown.length) {
    segments.push({ text: markdown.slice(lastIndex), protected: false });
  }

  return segments;
}

// ── Inject links into a single plain-text segment ───────────────────────────

function injectLinksInSegment(
  text: string,
  keywordMap: Map<string, string>,
  usedSlugs: Set<string>,
  linksAdded: { count: number },
  linkMap: Array<{ keyword: string; slug: string }>,
): string {
  // Also skip anything already inside a markdown link [...](...) or image ![]()
  const linkPattern = /!?\[[^\]]*\]\([^)]*\)/g;
  const linkSegments: Segment[] = [];
  let last = 0;

  for (const match of text.matchAll(linkPattern)) {
    if (match.index! > last) {
      linkSegments.push({ text: text.slice(last, match.index), protected: false });
    }
    linkSegments.push({ text: match[0], protected: true });
    last = match.index! + match[0].length;
  }
  if (last < text.length) {
    linkSegments.push({ text: text.slice(last), protected: false });
  }

  return linkSegments
    .map((seg) => {
      if (seg.protected) return seg.text;

      let result = seg.text;

      for (const [keyword, slug] of keywordMap) {
        if (linksAdded.count >= MAX_LINKS) break;
        if (usedSlugs.has(slug)) continue; // one link per destination

        // Case-insensitive whole-word match
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(?<![\\[\\w])${escaped}(?![\\]\\w])`, "i");

        if (regex.test(result)) {
          const match = result.match(regex);
          if (match) {
            const original = match[0];
            result = result.replace(
              regex,
              `[${original}](/blog/${slug})`,
            );
            usedSlugs.add(slug);
            linksAdded.count++;
            linkMap.push({ keyword: original, slug });
          }
        }
      }

      return result;
    })
    .join("");
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function autoLinkContent(
  content: string,
  currentSlug?: string,
): Promise<InternalLinkResult> {
  const summaries = await getAllPostSummaries();
  const keywordMap = buildKeywordMap(summaries, currentSlug);
  const segments = segmentMarkdown(content);

  const usedSlugs = new Set<string>();
  const linksAdded = { count: 0 };
  const linkMap: Array<{ keyword: string; slug: string }> = [];

  const resultParts = segments.map((seg) => {
    if (seg.protected || linksAdded.count >= MAX_LINKS) return seg.text;
    return injectLinksInSegment(seg.text, keywordMap, usedSlugs, linksAdded, linkMap);
  });

  return {
    content: resultParts.join(""),
    linksAdded: linksAdded.count,
    linkMap,
  };
}
