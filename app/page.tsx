import Link from "next/link";
import { getAllPosts } from "@/lib/blogService";
import { getForumPosts } from "@/lib/forumService";
import { getTutorials } from "@/lib/tutorialService";
import { getAllVideoTags } from "@/lib/videoService";
import RecommendedCarousel from "@/components/home/RecommendedCarousel";
import ContinueLearningCarousel from "@/components/home/ContinueLearningCarousel";

export default async function HomePage() {
  const [latestBlogs, trendingForumsResult, tutorialsResult, videoTags] = await Promise.all([
    getAllPosts({ limit: 10 }).catch(() => []),
    getForumPosts({ sort: "hot", limit: 8 }).then((r) => r.posts).catch(() => []),
    getTutorials({ limit: 6, includeUnpublished: false }).then((r) => r.tutorials).catch(() => []),
    getAllVideoTags().catch(() => []),
  ]);

  const tutorials = JSON.parse(JSON.stringify(tutorialsResult ?? [])) as Array<{
    slug?: unknown;
    title?: unknown;
    excerpt?: unknown;
    cover_image?: unknown;
    difficulty?: unknown;
    estimated_minutes?: unknown;
    interactive_blocks?: unknown[];
  }>;

  const carouselTutorials = tutorials.slice(0, 6).map((tutorial) => ({
    slug: String(tutorial.slug ?? ""),
    title: String(tutorial.title ?? ""),
    excerpt: tutorial.excerpt == null ? null : String(tutorial.excerpt),
    cover_image: tutorial.cover_image == null ? null : String(tutorial.cover_image),
    difficulty: tutorial.difficulty == null ? undefined : String(tutorial.difficulty),
    estimated_minutes: typeof tutorial.estimated_minutes === "number" ? tutorial.estimated_minutes : undefined,
    interactive_blocks: Array.isArray(tutorial.interactive_blocks)
      ? new Array(tutorial.interactive_blocks.length).fill(null)
      : [],
  }));
  const carouselBlogs = latestBlogs.slice(0, 6);
  const recentlyUpdated = latestBlogs.slice(3, 6);
  const trendingDiscussions = trendingForumsResult.slice(0, 4);
  const popularDiscussions = trendingForumsResult.slice(0, 4);

  const topicHubs = Array.from(
    new Set(
      [...videoTags, ...latestBlogs.flatMap((p) => p.tags ?? [])]
        .map((item) => String(item).trim())
        .filter(Boolean),
    ),
  ).slice(0, 10);


  return (
    <section className="mx-auto w-full max-w-[1500px] px-6 py-12 md:py-16">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-sm md:p-12 dark:border-slate-800 dark:bg-[#0e1829]">
        <p className="mb-4 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400">
          TatvaOps Platform
        </p>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
          <div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl dark:text-white">
              AI-Powered Construction Content, Community, and Decision Support
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg dark:text-slate-300">
              TatvaOps combines a smart blog engine, practical city-wise cost guides, and a live
              forums community so builders, estimators, and teams can plan, discuss, and execute
              with confidence.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/blog" className="inline-flex min-w-[150px] items-center justify-center rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-400">
                Explore Blogs
              </Link>
              <Link href="/forums" className="inline-flex min-w-[150px] items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800/50">
                Join Forums
              </Link>
            </div>

          </div>

          {/* Right: feature mini-cards */}
          <div className="grid grid-cols-1 gap-4 self-end sm:grid-cols-3 lg:grid-cols-1">
            {[
              { title: "Blogs",  body: "AI-generated, SEO-structured, editable content.", href: "/blog" },
              { title: "Forums", body: "Q&A, opinions, voting, and practical discussion.", href: "/forums" },
              { title: "Shorts", body: "CMS, moderation, autopopulate, and analytics.", href: "/shorts" },
            ].map((card) => (
              <Link key={card.title} href={card.href} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-200 hover:bg-sky-50/60 dark:border-slate-700/60 dark:bg-slate-800/60 dark:hover:border-sky-700/40 dark:hover:bg-slate-800">
                <p className="text-xl font-bold text-slate-900 dark:text-white">{card.title}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{card.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Platform Intelligence ─────────────────────────────────────────── */}
      <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-400">Platform Intelligence</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">How TatvaOps works for you</h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              ),
              title: "Personalized recommendations",
              body: "Content is ranked based on your reading history, engagement patterns, and topics you explore most.",
              accent: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ),
              title: "Community-reviewed accuracy",
              body: "Expert contributors review and approve edits. Every article shows its verification status and revision history.",
              accent: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              ),
              title: "Intelligent content discovery",
              body: "Blogs, tutorials, forums, and short videos are connected by topic signals across all content types.",
              accent: "text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700/40 dark:bg-slate-800/40">
              <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${item.accent}`}>
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Smart Discovery Hub ───────────────────────────────────────────── */}
      <section className="mt-8 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700/50 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-400">Smart Discovery Hub</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Your connected knowledge workspace</h2>
          </div>
          <Link href="/ask" className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400">
            Ask AI anything on TatvaOps
          </Link>
        </div>

        {/* Top row */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Continue Learning */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700/40 dark:bg-slate-800/40">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Continue Learning</h3>
            <ContinueLearningCarousel tutorials={carouselTutorials} />
          </div>

          {/* Recommended For You */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700/40 dark:bg-slate-800/40">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recommended For You</h3>
            <RecommendedCarousel blogs={carouselBlogs} />
          </div>

          {/* Trending Discussions */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700/40 dark:bg-slate-800/40">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Trending Discussions</h3>
            {trendingDiscussions.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {trendingDiscussions.map((forum) => (
                  <li key={forum.slug} className="flex gap-2.5">
                    <div className="flex w-8 flex-shrink-0 flex-col items-center">
                      <span className="text-sm leading-none">🔥</span>
                      <span className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">{forum.upvote_count}</span>
                    </div>
                    <div className="min-w-0">
                      <Link href={`/forums/${forum.slug}`} className="line-clamp-2 block text-sm font-semibold text-slate-900 hover:text-sky-600 dark:text-white dark:hover:text-sky-400">
                        {forum.title}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {new Date(forum.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })} · {forum.author_name}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No discussions yet.</p>
            )}
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Popular Discussions */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700/40 dark:bg-slate-800/40">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Popular Discussions</h3>
            {popularDiscussions.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {popularDiscussions.map((forum) => (
                  <li key={forum.slug} className="flex gap-2.5">
                    <div className="flex w-8 flex-shrink-0 flex-col items-center">
                      <span className="text-sm leading-none">🔥</span>
                      <span className="mt-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">{forum.upvote_count}</span>
                    </div>
                    <div className="min-w-0">
                      <Link href={`/forums/${forum.slug}`} className="line-clamp-1 block text-sm font-semibold text-slate-900 hover:text-sky-600 dark:text-white dark:hover:text-sky-400">
                        {forum.title}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {new Date(forum.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })} · {forum.author_name}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No discussions yet.</p>
            )}
          </div>

          {/* Recently Updated */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700/40 dark:bg-slate-800/40">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recently Updated</h3>
            {recentlyUpdated.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {recentlyUpdated.map((blog) => (
                  <li key={blog.slug}>
                    <Link href={`/blog/${blog.slug}`} className="group block">
                      <p className="line-clamp-1 text-sm font-semibold text-slate-900 group-hover:text-sky-600 dark:text-white dark:group-hover:text-sky-400">
                        {blog.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {new Date(blog.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })} · {blog.author}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Nothing recently updated.</p>
            )}
          </div>

          {/* Topic Explorer */}
          <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700/40 dark:bg-slate-800/60">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Topic Explorer</h3>
            {topicHubs.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {topicHubs.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No topics yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── What TatvaOps includes ────────────────────────────────────────── */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl dark:text-white">What TatvaOps includes</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 md:text-base dark:text-slate-400">
          A complete construction content platform built to attract search traffic, answer practical
          site questions, and keep your publishing workflow fast and consistent.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          {
            title: "AI Blog Generation",
            body: "Generate high-intent construction articles with references, clean structure, and local cost context. Publish directly through the CMS.",
          },
          {
            title: "Forums + Engagement Layer",
            body: "Run Reddit-style threads with comments, replies, votes, best answers, and trending signals to keep the platform active and useful.",
          },
          {
            title: "Operations + Growth Controls",
            body: "Use admin tools for autopopulate, moderation, analytics, newsletters, and activity simulation to scale content without losing quality.",
          },
        ].map((feature) => (
          <article key={feature.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/60 dark:bg-[#1e293b] dark:hover:border-slate-600 dark:hover:bg-[#263447]">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">{feature.body}</p>
          </article>
        ))}
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <div className="mt-12 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:flex md:items-center md:justify-between md:gap-6 dark:border-slate-700/50 dark:bg-slate-900/60">
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Start with what you need now</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Read practical guides and jump into active discussions.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 md:mt-0">
          <Link href="/blog" className="inline-flex min-w-[140px] items-center justify-center rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400">
            Go to Blog
          </Link>
          <Link href="/forums" className="inline-flex min-w-[140px] items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800/50">
            Go to Forums
          </Link>
        </div>
      </div>
    </section>
  );
}
