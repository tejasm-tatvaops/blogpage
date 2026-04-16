export const DEFAULT_BLOG_COVER_IMAGE = "/images/blog-placeholder.svg";
export const LEGACY_BLOG_COVER_IMAGE = "/images/blog-default.svg";

export const buildCoverImageUrl = ({
  title,
  category,
  tags = [],
}: {
  title: string;
  category?: string;
  tags?: string[];
}): string => {
  if (!title && !category) return DEFAULT_BLOG_COVER_IMAGE;

  const params = new URLSearchParams();
  if (title)    params.set("title",    title.slice(0, 150));
  if (category) params.set("category", category.slice(0, 80));
  if (tags.length) params.set("tags", tags.slice(0, 5).join(","));

  return `/api/cover-image?${params.toString()}`;
};
