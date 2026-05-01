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
  const popularDiscussions = trendingForumsResult.slice(0, 4);

  const topicHubs = Array.from(
    new Set(
      [...videoTags, ...latestBlogs.flatMap((p) => p.tags ?? [])]
        .map((item) => String(item).trim())
        .filter(Boolean),
    ),
  ).slice(0, 10);


  return (
    <section className="max-w-[1200px] mx-auto px-6 pl-[110px] space-y-10 py-8">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-[28px] overflow-hidden min-h-[420px] flex items-center border border-black/5 dark:border-white/10"
        style={{ backgroundImage: "url('/images/construction/site-hero-2.png')", backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-white/10 dark:from-black/70 dark:via-black/50 dark:to-transparent" />
        <div className="relative z-10 max-w-[520px] px-10 py-12">
        <p className="mb-4 inline-flex rounded-full border border-orange-200/50 bg-orange-50/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400">
          TatvaOps Platform
        </p>
            <h1 className="text-[42px] leading-tight font-semibold text-black dark:text-white">
              AI-Powered Construction Content,{" "}
              <span className="text-orange-500">Community</span>, and Decision Support
            </h1>
            <p className="text-sm text-gray-600 dark:text-white/60 mt-4">
              TatvaOps combines a smart blog engine, practical city-wise cost guides, and a live
              forums community so builders, estimators, and teams can plan, discuss, and execute
              with confidence.
            </p>
            <div className="flex gap-3 mt-6">
              <Link href="/blog" className="bg-orange-500 text-white px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ease-out inline-flex items-center justify-center text-sm font-semibold">
                Explore Blogs
              </Link>
              <Link href="/forums" className="border border-black/20 dark:border-white/20 px-5 py-2.5 rounded-xl text-sm font-semibold text-black dark:text-white">
                Join Forums
              </Link>
            </div>
            <div className="flex gap-4 mt-6">
            {[
              { title: "Blogs",  body: "AI-generated, SEO-structured, editable content.", href: "/blog" },
              { title: "Forums", body: "Q&A, opinions, voting, and practical discussion.", href: "/forums" },
              { title: "Shorts", body: "CMS, moderation, autopopulate, and analytics.", href: "/shorts" },
            ].map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="flex-1 p-4 rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10"
              >
                <p className="text-sm font-semibold text-black dark:text-white">{card.title}</p>
                <p className="text-xs text-gray-500 dark:text-white/60 mt-1">{card.body}</p>
              </Link>
            ))}
            </div>
          </div>
      </div>

      {/* ── Platform Intelligence ─────────────────────────────────────────── */}
      <section className="rounded-[28px] p-10 bg-[#f6e7d8] dark:bg-[rgba(20,25,45,0.6)] border border-black/5 dark:border-white/10">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-400">Platform Intelligence</p>
        <h2 className="text-3xl font-semibold text-center text-black dark:text-white mt-2">A complete construction content platform</h2>
        <p className="text-sm text-gray-500 dark:text-white/60 text-center mt-2">
          Built to attract high-intent traffic, answer practical site questions, and streamline your publishing workflow with architectural precision.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
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
            <div key={item.title} className="p-6 rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10">
              <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${item.accent}`}>
                {item.icon}
              </div>
              <div>
                <p className="text-lg font-semibold text-black dark:text-white mt-3">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-white/60">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Smart Discovery Hub ───────────────────────────────────────────── */}
      <section className="rounded-2xl p-4 bg-white/70 dark:bg-[rgba(20,25,45,0.7)] backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-md transition-all duration-300 ease-out">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-400">Smart Discovery Hub</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Your connected knowledge workspace</h2>
          </div>
          <Link href="/ask" className="inline-flex items-center rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 ease-out hover:shadow-lg">
            Ask AI anything on TatvaOps
          </Link>
        </div>

        {/* Top row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

          {/* Continue Learning */}
          <div className="relative rounded-2xl overflow-hidden min-h-[260px]">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Continue Learning</h3>
            <ContinueLearningCarousel tutorials={carouselTutorials} />
          </div>

          {/* Recommended For You */}
          <div className="relative rounded-2xl overflow-hidden min-h-[260px]">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Recommended For You</h3>
            <RecommendedCarousel blogs={carouselBlogs} />
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">

          {/* Popular Discussions */}
          <div className="rounded-2xl p-4 bg-white/70 dark:bg-[rgba(20,25,45,0.7)] backdrop-blur-xl border border-black/5 dark:border-white/10">
            <h3 className="text-sm font-semibold mb-3 text-black dark:text-white">Popular Discussions</h3>
            {popularDiscussions.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {popularDiscussions.map((forum) => (
                  <li key={forum.slug} className="flex justify-between items-start py-2 border-b border-black/5 dark:border-white/5">
                    <div className="flex w-8 flex-shrink-0 flex-col items-center">
                      <span className="text-sm leading-none text-orange-500" aria-hidden>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m9 3-3 18" />
                          <path d="m15 3-3 18" />
                          <path d="M4 9h14" />
                          <path d="M3 15h14" />
                        </svg>
                      </span>
                      <span className="mt-0.5 text-xs font-bold text-orange-500">{forum.upvote_count}</span>
                    </div>
                    <div className="min-w-0">
                      <Link href={`/forums/${forum.slug}`} className="line-clamp-1 block text-sm text-black dark:text-white">
                        {forum.title}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-gray-400">
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
          <div className="rounded-2xl p-4 bg-white/70 dark:bg-[rgba(20,25,45,0.7)] backdrop-blur-xl border border-black/5 dark:border-white/10">
            <h3 className="text-sm font-semibold mb-3 text-black dark:text-white">Recently Updated</h3>
            {recentlyUpdated.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {recentlyUpdated.map((blog) => (
                  <li key={blog.slug} className="py-2 border-b border-black/5 dark:border-white/5">
                    <Link href={`/blog/${blog.slug}`} className="group block">
                      <p className="line-clamp-1 text-sm text-black dark:text-white">
                        {blog.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
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
          <div className="rounded-2xl p-4 bg-white/70 dark:bg-[rgba(20,25,45,0.7)] backdrop-blur-xl border border-black/5 dark:border-white/10">
            <h3 className="text-sm font-semibold mb-3 text-black dark:text-white">Topic Explorer</h3>
            {topicHubs.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {topicHubs.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60 hover:bg-orange-500 hover:text-white transition"
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
      <div className="rounded-[28px] p-10 bg-[#f6e7d8] dark:bg-[rgba(20,25,45,0.6)] border border-black/5 dark:border-white/10">
        <h2 className="text-3xl font-semibold text-center text-black dark:text-white">A complete construction content platform</h2>
        <p className="text-sm text-gray-500 dark:text-white/60 text-center mt-2">
          Built to attract high-intent traffic, answer practical site questions, and streamline your publishing workflow with architectural precision.
        </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
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
          <article key={feature.title} className="p-6 rounded-xl bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10">
            <h3 className="text-lg font-semibold text-black dark:text-white">{feature.title}</h3>
            <p className="mt-2 text-sm leading-7 text-gray-500 dark:text-white/60">{feature.body}</p>
          </article>
        ))}
      </div>
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <div className="rounded-[28px] p-10 bg-gradient-to-r from-orange-500 to-orange-600 text-white flex justify-between items-center">
        <div>
          <h3 className="text-3xl font-semibold">Start with what you need now</h3>
          <p className="mt-2 text-sm text-white/90">Access practical construction guides and join thousands of professionals in active technical discussions.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 md:mt-0">
          <Link href="/blog" className="inline-flex min-w-[140px] items-center justify-center rounded-lg border border-white/80 bg-white px-4 py-2.5 text-sm font-semibold !text-orange-600 transition hover:bg-white/90">
            Go to Blog
          </Link>
          <Link href="/forums" className="inline-flex min-w-[140px] items-center justify-center rounded-lg border border-white/80 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
            Go to Forums
          </Link>
        </div>
      </div>

      <button
        type="button"
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg hover:scale-105 transition"
        aria-label="Quick action"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m12 2 2.45 4.97L20 7.8l-4 3.9.94 5.5L12 14.9l-4.94 2.6.94-5.5-4-3.9 5.55-.83L12 2Z" />
        </svg>
      </button>
    </section>
  );
}
