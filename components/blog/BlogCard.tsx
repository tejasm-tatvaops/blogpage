import Link from "next/link";
import type { BlogPost } from "@/lib/blogService";
import { CoverImage } from "./CoverImage";

type BlogCardProps = {
  post: BlogPost;
  resolvedImageSrc?: string;
  fallbackImagePool?: string[];
  intelligence?: {
    bucket?: "personalized" | "trending" | "exploration";
    reasonTag?: string;
  };
  highlightTags?: string[];
  variantTone?: "indigo" | "emerald" | "amber";
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

export function BlogCard({
  post,
  resolvedImageSrc,
  fallbackImagePool,
  intelligence,
  highlightTags = [],
  variantTone = "indigo",
}: BlogCardProps) {
  const imageResolution = resolvedImageSrc
    ? { primary: resolvedImageSrc, fallbackPool: fallbackImagePool ?? [] }
    : resolveCardImage(post);

  const normalizedHighlights = highlightTags.map((tag) => tag.toLowerCase());
  const replyCount =
    typeof (post as { comment_count?: number }).comment_count === "number"
      ? (post as { comment_count?: number }).comment_count ?? 0
      : 0;
  const showPopular = post.view_count >= 80 || post.upvote_count >= 12;
  const showActive = replyCount >= 6;
  const reasonLabel =
    intelligence?.bucket === "personalized"
      ? `🧠 Because you like ${intelligence.reasonTag ?? post.tags[0] ?? post.category}`
      : intelligence?.bucket === "trending"
      ? "🔥 Trending"
      : intelligence?.bucket === "exploration"
      ? "✨ Discover"
      : null;
  const toneClass =
    variantTone === "emerald"
      ? "from-emerald-600/35 via-emerald-900/30 to-black/65"
      : variantTone === "amber"
      ? "from-amber-600/35 via-amber-900/30 to-black/65"
      : "from-indigo-600/35 via-indigo-900/30 to-black/65";

  return (
    <article className="group relative h-full min-h-[26rem] overflow-hidden bg-black">
      <Link href={`/blog/${post.slug}`} className="block h-full">
        <div className="absolute inset-0 overflow-hidden bg-slate-100">
          <CoverImage
            src={imageResolution.primary}
            slug={post.slug}
            alt={post.title}
            disablePlaceholderFallback
            fallbackSources={imageResolution.fallbackPool}
            debugId={post.slug}
            className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            priority={false}
          />
        </div>
        <div className={`absolute inset-0 bg-gradient-to-t ${toneClass}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 text-white">
          {(reasonLabel || showPopular || showActive) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {reasonLabel && (
                <span className="rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white border border-white/20">
                  {reasonLabel}
                </span>
              )}
              {showPopular && (
                <span className="rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                  🔥 Popular
                </span>
              )}
              {showActive && (
                <span className="rounded-full bg-emerald-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                  💬 Active
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs font-medium text-white/80">
            <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
            <span aria-hidden>•</span>
            <span>{post.author}</span>
            <span aria-hidden>•</span>
            <span>{post.view_count.toLocaleString()} views</span>
            <span aria-hidden>•</span>
            <span>{replyCount.toLocaleString()} replies</span>
            <span aria-hidden>•</span>
            <span>{post.upvote_count.toLocaleString()} likes</span>
          </div>

          <h2 className="line-clamp-2 text-2xl font-extrabold leading-tight text-white sm:text-[1.75rem]">
            {post.title}
          </h2>

          <p className="line-clamp-3 text-sm leading-6 text-white/80">{post.excerpt}</p>

          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={`${post.id}-${tag}`}
                className={`rounded-full px-2.5 py-1 text-xs font-medium border transition ${
                  normalizedHighlights.includes(tag.toLowerCase())
                    ? "bg-white text-slate-900 border-white/80"
                    : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                }`}
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
