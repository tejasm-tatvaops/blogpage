import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getVideoPostBySlug, getAllVideoSlugs } from "@/lib/videoService";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const slugs = await getAllVideoSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getVideoPostBySlug(slug).catch(() => null);
  if (!post) return { title: "Short not found — TatvaOps" };

  const title = `${post.title} — TatvaOps Shorts`;
  const description = post.summary ?? post.shortCaption;
  const image = post.thumbnailUrl ?? undefined;

  return {
    title,
    description,
    alternates: { canonical: `${siteUrl}/shorts/${slug}` },
    openGraph: {
      title,
      description,
      url: `${siteUrl}/shorts/${slug}`,
      siteName: "TatvaOps",
      type: "video.other",
      images: image ? [{ url: image, width: 1280, height: 720, alt: post.title }] : [],
    },
    twitter: {
      card: "player",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

function buildVideoJsonLd(post: NonNullable<Awaited<ReturnType<typeof getVideoPostBySlug>>>) {
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: post.title,
    description: post.summary ?? post.shortCaption,
    thumbnailUrl: post.thumbnailUrl ?? undefined,
    uploadDate: post.createdAt,
    duration: post.durationSeconds ? `PT${post.durationSeconds}S` : undefined,
    contentUrl: post.videoUrl ?? undefined,
    embedUrl: post.embedUrl ?? undefined,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/WatchAction",
        userInteractionCount: post.views,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: post.likes,
      },
    ],
  };
}

export default async function ShortDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getVideoPostBySlug(slug).catch(() => null);
  if (!post) notFound();

  const jsonLd = buildVideoJsonLd(post);

  const embedSrc =
    post.sourceType === "youtube" && post.youtubeVideoId
      ? `https://www.youtube.com/embed/${post.youtubeVideoId}?autoplay=0&rel=0&modestbranding=1`
      : post.videoUrl ?? null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-2xl px-4 py-8">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-white/50">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/shorts" className="hover:text-white">Shorts</Link>
            <span>/</span>
            <span className="text-white/80 line-clamp-1">{post.title}</span>
          </nav>

          {/* Video embed */}
          {embedSrc ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
              <iframe
                src={embedSrc}
                title={post.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          ) : post.thumbnailUrl ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
              <Image
                src={post.thumbnailUrl}
                alt={post.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 672px"
              />
            </div>
          ) : null}

          {/* Meta */}
          <div className="mt-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 hover:bg-white/20"
                >
                  #{tag}
                </Link>
              ))}
            </div>

            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{post.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/75">{post.shortCaption}</p>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-white/50">
              <span>{post.views.toLocaleString()} views</span>
              <span>{post.likes.toLocaleString()} likes</span>
              {post.durationSeconds && (
                <span>
                  {Math.floor(post.durationSeconds / 60)}:{String(post.durationSeconds % 60).padStart(2, "0")}
                </span>
              )}
            </div>
          </div>

          {/* Transcript */}
          {post.transcript && (
            <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/50">Transcript</h2>
              <p className="text-sm leading-7 text-white/80 whitespace-pre-wrap">{post.transcript}</p>
            </section>
          )}

          {/* CTA links */}
          <div className="mt-8 flex flex-wrap gap-3">
            {post.linkedBlogSlug && (
              <Link
                href={`/blog/${post.linkedBlogSlug}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
              >
                Read full article →
              </Link>
            )}
            {post.linkedForumSlug && (
              <Link
                href={`/forums/${post.linkedForumSlug}`}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
              >
                Join discussion →
              </Link>
            )}
            <Link
              href="/shorts"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/70 hover:text-white"
            >
              ← Back to Shorts
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
