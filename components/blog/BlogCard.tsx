import Link from "next/link";
import type { BlogPost } from "@/lib/blogService";
import { CoverImage } from "./CoverImage";

type BlogCardProps = {
  post: BlogPost;
  resolvedImageSrc?: string;
  fallbackImagePool?: string[];
};

const CARD_LOCAL_IMAGE_POOL = [
  "/images/construction/site-1.jpg",
  "/images/construction/site-2.jpg",
  "/images/construction/site-3.jpg",
  "/images/construction/site-4.jpg",
];

const hashForIndex = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const resolveCardImage = (post: BlogPost): { primary: string; fallbackPool: string[] } => {
  const provided = (post.cover_image ?? "").trim();
  const key = `${post.slug}|${post.category}|${post.tags.join(",")}`;
  const index = hashForIndex(key) % CARD_LOCAL_IMAGE_POOL.length;
  const orderedPool = CARD_LOCAL_IMAGE_POOL.map((_, offset) => {
    const i = (index + offset) % CARD_LOCAL_IMAGE_POOL.length;
    return CARD_LOCAL_IMAGE_POOL[i];
  });

  if (provided) {
    return {
      primary: provided,
      fallbackPool: orderedPool,
    };
  }

  return {
    primary: orderedPool[0],
    fallbackPool: orderedPool.slice(1),
  };
};

const formatDate = (dateString: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));

export function BlogCard({ post, resolvedImageSrc, fallbackImagePool }: BlogCardProps) {
  const imageResolution = resolvedImageSrc
    ? { primary: resolvedImageSrc, fallbackPool: fallbackImagePool ?? [] }
    : resolveCardImage(post);

  return (
    <article className="group h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link href={`/blog/${post.slug}`} className="block h-full">
        <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
          <CoverImage
            src={imageResolution.primary}
            slug={post.slug}
            alt={post.title}
            disablePlaceholderFallback
            fallbackSources={imageResolution.fallbackPool}
            debugId={post.slug}
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            priority={false}
          />
        </div>

        <div className="flex h-[calc(100%-12rem)] flex-col gap-3 p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
            <span aria-hidden>•</span>
            <span>{post.author}</span>
            <span aria-hidden>•</span>
            <span>{post.view_count.toLocaleString()} views</span>
          </div>

          <h2 className="line-clamp-2 text-xl font-bold leading-snug text-slate-900">{post.title}</h2>

          <p className="line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>

          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={`${post.id}-${tag}`}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </article>
  );
}
