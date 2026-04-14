export const DEFAULT_BLOG_COVER_IMAGE = "/images/blog-default.svg";

const normalizeTerm = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const buildCoverImageUrl = ({
  title,
  category,
  tags = [],
}: {
  title: string;
  category?: string;
  tags?: string[];
}): string => {
  const seedParts = [normalizeTerm(title), normalizeTerm(category ?? ""), ...tags.map(normalizeTerm)]
    .filter(Boolean)
    .slice(0, 3);
  const sig = hashString(`${title}|${category ?? ""}|${tags.join(",")}`) % 10_000;
  return seedParts.length > 0 ? `${DEFAULT_BLOG_COVER_IMAGE}?v=${sig}` : DEFAULT_BLOG_COVER_IMAGE;
};
