import Link from "next/link";
import { getAllPosts } from "@/lib/blogService";
import { getForumPosts } from "@/lib/forumService";
import { getTutorials } from "@/lib/tutorialService";
import { getAllVideoTags } from "@/lib/videoService";

export default async function HomePage() {
  const [latestBlogs, trendingForumsResult, tutorialsResult, videoTags] = await Promise.all([
    getAllPosts({ limit: 10 }).catch(() => []),
    getForumPosts({ sort: "hot", limit: 8 }).then((r) => r.posts).catch(() => []),
    getTutorials({ limit: 6, includeUnpublished: false }).then((r) => r.tutorials).catch(() => []),
    getAllVideoTags().catch(() => []),
  ]);

  const tutorials = tutorialsResult as (typeof tutorialsResult[0] & {
    interactive_blocks?: unknown[];
    difficulty?: string;
    estimated_minutes?: number;
  })[];

  const featuredTutorial = tutorials[0];
  const moreTutorials = tutorials.slice(1, 3);
  const featuredBlog = latestBlogs[0];
  const moreBlogsForYou = latestBlogs.slice(1, 3);
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

            {featuredTutorial ? (
              <>
                {/* Featured tutorial */}
                <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2">
                    {featuredTutorial.difficulty && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        featuredTutorial.difficulty === "beginner"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : featuredTutorial.difficulty === "intermediate"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                        {featuredTutorial.difficulty}
                      </span>
                    )}
                    {featuredTutorial.estimated_minutes && (
                      <span className="text-[11px] text-slate-400">~{featuredTutorial.estimated_minutes} min</span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 dark:text-white">
                    {featuredTutorial.title}
                  </p>
                  {featuredTutorial.excerpt && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                      {featuredTutorial.excerpt}
                    </p>
                  )}
                  <div className="mt-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="h-full w-[4%] rounded-full bg-sky-500" />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-[11px] text-slate-400">
                        1 of {featuredTutorial.interactive_blocks?.length ?? "—"} steps completed
                      </p>
                      <Link href={`/tutorials/${featuredTutorial.slug}`} className="text-xs font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400">
                        Continue →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* More tutorials */}
                {moreTutorials.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {moreTutorials.map((t) => (
                      <li key={t.slug}>
                        <Link href={`/tutorials/${t.slug}`} className="group flex items-start gap-2 rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-700/40">
                          <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-xs font-semibold text-slate-700 group-hover:text-sky-600 dark:text-slate-300">
                              {t.title}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {(t as typeof t & { difficulty?: string }).difficulty} · {(t as typeof t & { estimated_minutes?: number }).estimated_minutes ?? 5} min
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-4 text-center dark:border-slate-700">
                <p className="text-sm text-slate-400">No tutorials yet</p>
                <Link href="/tutorials" className="mt-1 block text-xs font-semibold text-sky-600">Browse all →</Link>
              </div>
            )}
          </div>

          {/* Recommended For You */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-700/40 dark:bg-slate-800/40">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recommended For You</h3>

            {featuredBlog ? (
              <>
                {/* Featured blog */}
                <Link href={`/blog/${featuredBlog.slug}`} className="group mt-3 block rounded-lg border border-slate-200 bg-white p-3 transition hover:border-sky-200 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-sky-700/40">
                  {/* Tags */}
                  {featuredBlog.tags && featuredBlog.tags.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {featuredBlog.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 group-hover:text-sky-700 dark:text-white dark:group-hover:text-sky-400">
                    {featuredBlog.title}
                  </p>
                  {featuredBlog.excerpt && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                      {featuredBlog.excerpt}
                    </p>
                  )}
                  <div className="mt-2.5 flex items-center gap-3 border-t border-slate-100 pt-2 dark:border-slate-700">
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                      {featuredBlog.view_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg>
                      {featuredBlog.upvote_count ?? 0}
                    </span>
                    <span className="ml-auto text-[11px] text-slate-400">{featuredBlog.author}</span>
                  </div>
                </Link>

                {/* More blogs */}
                {moreBlogsForYou.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {moreBlogsForYou.map((blog) => (
                      <li key={blog.slug}>
                        <Link href={`/blog/${blog.slug}`} className="group flex items-start gap-2 rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-700/40">
                          <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-sky-400" />
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-xs font-semibold text-slate-700 group-hover:text-sky-600 dark:text-slate-300">
                              {blog.title}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {blog.view_count ?? 0} views · {blog.upvote_count ?? 0} likes
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="mt-3 rounded-lg border border-dashed border-slate-200 p-4 text-center dark:border-slate-700">
                <p className="text-sm text-slate-400">No posts yet</p>
                <Link href="/blog" className="mt-1 block text-xs font-semibold text-sky-600">Browse all →</Link>
              </div>
            )}
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
