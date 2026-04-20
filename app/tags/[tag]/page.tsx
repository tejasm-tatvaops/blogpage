import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllTags, getPostsByTag } from "@/lib/blogService";
import { getAllForumTags, getForumPosts } from "@/lib/forumService";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tatvaops.com").replace(/\/+$/, "");

type PageProps = {
  params: Promise<{ tag: string }>;
};

export const revalidate = 600;

export async function generateStaticParams() {
  try {
    const [blogTags, forumTags] = await Promise.all([getAllTags(), getAllForumTags()]);
    const allTags = [...new Set([...blogTags, ...forumTags])];
    return allTags.map((tag) => ({ tag: encodeURIComponent(tag) }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const canonicalUrl = `${SITE_URL}/tags/${encodeURIComponent(decoded)}`;

  return {
    title: `#${decoded} — Articles & Discussions | TatvaOps`,
    description: `Explore all blog posts and forum discussions tagged with "${decoded}" on TatvaOps — construction tech, BOQ workflows, estimation, and procurement intelligence.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      title: `#${decoded} | TatvaOps`,
      description: `All content tagged "${decoded}" — articles, guides, and community discussions.`,
      siteName: "TatvaOps",
    },
  };
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(iso),
  );

export default async function TagHubPage({ params }: PageProps) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);

  const [blogs, forumResult] = await Promise.all([
    getPostsByTag(decoded, 20).catch(() => []),
    getForumPosts({ tag: decoded, sort: "hot", limit: 20 }).catch(() => ({ posts: [] })),
  ]);

  const forums = forumResult.posts ?? [];

  if (blogs.length === 0 && forums.length === 0) notFound();

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="transition hover:text-app">Home</Link>
        <span aria-hidden>/</span>
        <Link href="/blog" className="transition hover:text-app">Blog</Link>
        <span aria-hidden>/</span>
        <span className="font-medium text-slate-700">#{decoded}</span>
      </nav>

      {/* Header */}
      <header className="mb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          #{decoded}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-app sm:text-4xl">
          All content tagged &ldquo;{decoded}&rdquo;
        </h1>
        <p className="mt-2 text-slate-500">
          {blogs.length} article{blogs.length !== 1 ? "s" : ""} &middot;{" "}
          {forums.length} discussion{forums.length !== 1 ? "s" : ""}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        {/* Articles */}
        <section aria-labelledby="articles-heading">
          <h2 id="articles-heading" className="mb-5 text-lg font-bold text-app">
            Articles
          </h2>
          {blogs.length === 0 ? (
            <p className="text-sm text-slate-400">No articles with this tag yet.</p>
          ) : (
            <ul className="space-y-4">
              {blogs.map((post) => (
                <li key={post.id} className="group rounded-2xl border border-slate-100 bg-surface p-5 shadow-sm transition hover:shadow-md">
                  <Link href={`/blog/${post.slug}`} className="block">
                    <span className="mb-1.5 inline-block rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-600">
                      {post.category}
                    </span>
                    <h3 className="text-base font-semibold leading-snug text-app transition group-hover:text-sky-700 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                      <span>{post.author}</span>
                      <span aria-hidden>·</span>
                      <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
                      {post.view_count > 0 && (
                        <>
                          <span aria-hidden>·</span>
                          <span>{post.view_count.toLocaleString()} views</span>
                        </>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Discussions */}
        <section aria-labelledby="discussions-heading">
          <h2 id="discussions-heading" className="mb-5 text-lg font-bold text-app">
            Discussions
          </h2>
          {forums.length === 0 ? (
            <p className="text-sm text-slate-400">No discussions with this tag yet.</p>
          ) : (
            <ul className="space-y-3">
              {forums.map((post) => (
                <li key={post.id}>
                  <Link
                    href={`/forums/${post.slug}`}
                    className="group flex flex-col gap-1 rounded-xl border border-slate-100 bg-surface p-4 shadow-sm transition hover:shadow-md"
                  >
                    <h3 className="text-sm font-semibold leading-snug text-slate-800 transition group-hover:text-indigo-700 line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{post.excerpt}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
                      <span>{post.comment_count} replies</span>
                      <span aria-hidden>·</span>
                      <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6">
            <Link
              href={`/forums?tag=${encodeURIComponent(decoded)}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
            >
              Browse all #{decoded} discussions
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
