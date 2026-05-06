const normalize = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const hasAny = (haystack: string, needles: string[]): boolean =>
  needles.some((needle) => needle && haystack.includes(normalize(needle)));

export function resolveContextualIdentity(input: {
  baseBadge?: string | null;
  profession?: string | null;
  expertise?: string | null;
  contextTags?: string[];
}): { label: string | null; contextual: boolean } {
  const baseBadge = String(input.baseBadge ?? "").trim();
  const profession = String(input.profession ?? "").trim();
  const expertise = String(input.expertise ?? "").trim();
  const context = normalize((input.contextTags ?? []).join(" "));

  if (!baseBadge && !profession) return { label: null, contextual: false };
  if (!context) return { label: baseBadge || profession || null, contextual: false };

  const expertiseRelevant = expertise
    ? hasAny(context, [expertise, ...expertise.split(" ")])
    : false;
  const badgeRelevant = baseBadge
    ? hasAny(context, [baseBadge, ...baseBadge.split(" ")])
    : false;

  if (expertiseRelevant || badgeRelevant) {
    return { label: baseBadge || expertise || profession || null, contextual: true };
  }

  if (profession) return { label: profession, contextual: false };
  return { label: baseBadge || null, contextual: false };
}
