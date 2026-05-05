import Link from "next/link";
import { getAllPosts } from "@/lib/blogService";
import { getForumPosts } from "@/lib/forumService";
import { getTutorials } from "@/lib/tutorialService";
import { getAllVideoTags } from "@/lib/videoService";
import RecommendedCarousel from "@/components/home/RecommendedCarousel";
import ContinueLearningCarousel from "@/components/home/ContinueLearningCarousel";
import { HeroSection } from "@/components/home/HeroSection";
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
    <section className="mx-auto max-w-[1200px] space-y-6 px-3 py-4 sm:space-y-8 sm:px-4 sm:py-6 lg:space-y-10 lg:px-6 lg:py-8">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <HeroSection />

      {/* ── Platform Intelligence ─────────────────────────────────────────── */}
      <section className="rounded-[22px] border border-black/5 bg-slate-50/80 p-5 dark:border-[#1e2440] dark:bg-[rgba(13,17,40,0.6)] sm:rounded-[28px] sm:p-8 lg:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-600 dark:text-orange-400">Platform Intelligence</p>
        <h2 className="mt-2 text-center text-[26px] font-semibold text-black dark:text-white sm:text-[30px]">A complete construction content platform</h2>
        <p className="mt-2 text-center text-[13.5px] leading-relaxed text-gray-500 dark:text-[#8b92a8]">
          Built to attract high-intent traffic, answer practical site questions, and streamline your publishing workflow with architectural precision.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              ),
              title: "Personalized recommendations",
              body: "Content is ranked based on your reading history, engagement patterns, and topics you explore most.",
              accent: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/15 dark:text-indigo-400",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ),
              title: "Community-reviewed accuracy",
              body: "Expert contributors review and approve edits. Every article shows its verification status and revision history.",
              accent: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-400",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              ),
              title: "Intelligent content discovery",
              body: "Blogs, tutorials, forums, and short videos are connected by topic signals across all content types.",
              accent: "text-orange-600 bg-orange-50 dark:bg-orange-500/15 dark:text-orange-400",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-black/5 bg-white/70 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:border-[#1e2440] dark:bg-[rgba(13,17,40,0.5)] dark:hover:border-orange-500/15 dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${item.accent}`}>
                {item.icon}
              </div>
              <div>
                <p className="mt-3 text-[14px] font-semibold text-black dark:text-white">{item.title}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-gray-500 dark:text-[#8b92a8]">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Smart Discovery Hub ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-black/5 bg-white/70 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 ease-out dark:border-[#1e2440] dark:bg-[rgba(13,17,40,0.7)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-600 dark:text-orange-400">Smart Discovery Hub</p>
            <h2 className="mt-1 text-[22px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-[26px]">Your connected knowledge workspace</h2>
          </div>
          <Link href="/ask" className="inline-flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-white shadow-[0_2px_12px_rgba(249,115,22,0.25)] transition-all duration-200 hover:bg-orange-400 hover:shadow-[0_4px_16px_rgba(249,115,22,0.35)] sm:w-auto">
            Ask AI anything on TatvaOps
          </Link>
        </div>

        {/* Top row */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* Continue Learning */}
          <div className="relative min-h-[260px] overflow-hidden rounded-2xl">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-[#4d5470]">Continue Learning</h3>
            <ContinueLearningCarousel tutorials={carouselTutorials} />
          </div>

          {/* Recommended For You */}
          <div className="relative min-h-[260px] overflow-hidden rounded-2xl">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-[#4d5470]">Recommended For You</h3>
            <RecommendedCarousel blogs={carouselBlogs} />
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">

          {/* Popular Discussions */}
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 backdrop-blur-xl dark:border-[#1e2440] dark:bg-[rgba(13,17,40,0.5)]">
            <h3 className="mb-3 text-[13.5px] font-semibold text-black dark:text-white">Popular Discussions</h3>
            {popularDiscussions.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {popularDiscussions.map((forum) => (
                  <li key={forum.slug} className="flex items-start justify-between border-b border-black/5 py-2 dark:border-[#1e2440]">
                    <div className="flex w-8 shrink-0 flex-col items-center">
                      <span className="leading-none text-orange-500" aria-hidden>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m9 3-3 18" /><path d="m15 3-3 18" /><path d="M4 9h14" /><path d="M3 15h14" />
                        </svg>
                      </span>
                      <span className="mt-0.5 text-[11px] font-bold text-orange-500">{forum.upvote_count}</span>
                    </div>
                    <div className="min-w-0">
                      <Link href={`/forums/${forum.slug}`} className="line-clamp-1 block text-[13px] text-black transition hover:text-orange-600 dark:text-white dark:hover:text-orange-400">
                        {forum.title}
                      </Link>
                      <p className="mt-0.5 text-[10px] text-[#8b92a8]">
                        {new Date(forum.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })} · {forum.author_name}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12.5px] text-[#8b92a8]">No discussions yet.</p>
            )}
          </div>

          {/* Recently Updated */}
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 backdrop-blur-xl dark:border-[#1e2440] dark:bg-[rgba(13,17,40,0.5)]">
            <h3 className="mb-3 text-[13.5px] font-semibold text-black dark:text-white">Recently Updated</h3>
            {recentlyUpdated.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {recentlyUpdated.map((blog) => (
                  <li key={blog.slug} className="border-b border-black/5 py-2 dark:border-[#1e2440]">
                    <Link href={`/blog/${blog.slug}`} className="group block">
                      <p className="line-clamp-1 text-[13px] text-black transition group-hover:text-orange-600 dark:text-white dark:group-hover:text-orange-400">
                        {blog.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#8b92a8]">
                        {new Date(blog.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })} · {blog.author}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12.5px] text-[#8b92a8]">Nothing recently updated.</p>
            )}
          </div>

          {/* Topic Explorer */}
          <div className="rounded-2xl border border-black/5 bg-white/70 p-4 backdrop-blur-xl dark:border-[#1e2440] dark:bg-[rgba(13,17,40,0.5)]">
            <h3 className="mb-3 text-[13.5px] font-semibold text-black dark:text-white">Topic Explorer</h3>
            {topicHubs.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {topicHubs.map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.06em] text-slate-600 transition hover:border-orange-400 hover:bg-orange-500 hover:text-white dark:border-[#1e2440] dark:bg-[#0d1128] dark:text-[#8b92a8] dark:hover:border-orange-500/40 dark:hover:bg-orange-500 dark:hover:text-white"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[12.5px] text-[#8b92a8]">No topics yet.</p>
            )}
          </div>
        </div>

        {/* ProductHub removed from home for now — re-add: import ProductHub + <ProductHub /> */}
      </section>

      {/* ── What TatvaOps includes ────────────────────────────────────────── */}
      <div className="rounded-[22px] border border-black/5 bg-slate-50/80 p-5 dark:border-[#1e2440] dark:bg-[rgba(13,17,40,0.6)] sm:rounded-[28px] sm:p-8 lg:p-10">
        <h2 className="text-center text-[26px] font-semibold text-black dark:text-white sm:text-[30px]">A complete construction content platform</h2>
        <p className="mt-2 text-center text-[13.5px] leading-relaxed text-gray-500 dark:text-[#8b92a8]">
          Built to attract high-intent traffic, answer practical site questions, and streamline your publishing workflow with architectural precision.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
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
            <article key={feature.title} className="rounded-xl border border-black/5 bg-white/70 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] dark:border-[#1e2440] dark:bg-[rgba(13,17,40,0.5)] dark:hover:border-orange-500/15 dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
              <h3 className="text-[14px] font-semibold text-black dark:text-white">{feature.title}</h3>
              <p className="mt-2 text-[12.5px] leading-relaxed text-gray-500 dark:text-[#8b92a8]">{feature.body}</p>
            </article>
          ))}
        </div>
      </div>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-[22px] bg-gradient-to-r from-[#ea580c] to-[#f97316] p-5 text-white shadow-[0_8px_32px_rgba(234,88,12,0.35)] sm:rounded-[28px] sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:p-10">
        <div>
          <h3 className="text-[24px] font-semibold sm:text-[28px]">Start with what you need now</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-white/85">Access practical construction guides and join thousands of professionals in active technical discussions.</p>
        </div>
        <div className="mt-1 flex w-full flex-wrap gap-3 sm:w-auto md:mt-0">
          <Link href="/blog" className="inline-flex min-w-[140px] items-center justify-center rounded-xl border border-white/80 bg-white px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] !text-orange-600 transition hover:bg-white/90">
            Go to Blog
          </Link>
          <Link href="/forums" className="inline-flex min-w-[140px] items-center justify-center rounded-xl border border-white/80 px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-white transition hover:bg-white/12 hover:border-white">
            Go to Forums
          </Link>
        </div>
      </div>

      <Link
        href="/ask"
        title="Ask AI"
        aria-label="Ask AI"
        className="fixed bottom-4 right-4 z-[100] flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition hover:scale-105 sm:bottom-6 sm:right-6 sm:h-12 sm:w-12"
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
      </Link>
    </section>
  );
}
