export type SessionDiversityState = {
  recent_tags_seen: string[];
  recent_authors_seen: string[];
};

const MAX_RECENT_TAGS = 10;
const MAX_RECENT_AUTHORS = 10;

export const emptySessionDiversity = (): SessionDiversityState => ({
  recent_tags_seen: [],
  recent_authors_seen: [],
});

const trimUnique = (items: string[], max: number): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
};

export const parseSessionDiversityCookie = (raw?: string | null): SessionDiversityState => {
  if (!raw) return emptySessionDiversity();
  try {
    const parsed = JSON.parse(raw) as Partial<SessionDiversityState>;
    return {
      recent_tags_seen: trimUnique(parsed.recent_tags_seen ?? [], MAX_RECENT_TAGS),
      recent_authors_seen: trimUnique(parsed.recent_authors_seen ?? [], MAX_RECENT_AUTHORS),
    };
  } catch {
    return emptySessionDiversity();
  }
};

export const updateSessionDiversityState = (
  state: SessionDiversityState,
  nextTags: string[],
  nextAuthors: string[],
): SessionDiversityState => ({
  recent_tags_seen: trimUnique([...nextTags, ...state.recent_tags_seen], MAX_RECENT_TAGS),
  recent_authors_seen: trimUnique([...nextAuthors, ...state.recent_authors_seen], MAX_RECENT_AUTHORS),
});
