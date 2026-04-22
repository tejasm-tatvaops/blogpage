import Link from "next/link";
import { getAllPosts } from "@/lib/blogService";
import { getForumPosts } from "@/lib/forumService";
import { getTutorials } from "@/lib/tutorialService";
import { getAllVideoTags } from "@/lib/videoService";

export default async function HomePage() {
  const [latestBlogs, trendingForums, tutorialsResult, videoTags] = await Promise.all([
    getAllPosts({ limit: 8 }).catch(() => []),
    getForumPosts({ sort: "hot", limit: 6 }).then((result) => result.posts).catch(() => []),
    getTutorials({ limit: 6, includeUnpublished: false }).then((result) => result.tutorials).catch(() => []),
    getAllVideoTags().catch(() => []),
  ]);
  const continueLearning = tutorialsResult.slice(0, 3);
  const recommendedForYou = latestBlogs.slice(0, 3);
  const recentlyUpdated = latestBlogs.slice(3, 6);
  const topicHubs = Array.from(
    new Set(
      [...videoTags, ...latestBlogs.flatMap((p) => p.tags ?? [])]
        .map((item) => String(item).trim())
        .filter(Boolean),
    ),
  ).slice(0, 8);

  return (
    <section className="mx-auto w-full max-w-[1500px] px-6 py-12 md:py-16">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className={[
        "hero-glow relative overflow-hidden rounded-3xl p-8 md:p-12",
        // Light: sky gradient
        "border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 shadow-sm",
        // Dark: deep navy with subtle blue-tinted gradient + glow (via .hero-glow::before)
        "dark:border-sky-900/20 dark:from-[#0b1220] dark:via-[#0e1829] dark:to-[#101d36] dark:shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_8px_32px_0_rgba(0,0,0,0.5)]",
      ].join(" ")}>

        {/* Platform badge */}
        <p className={[
          "mb-4 inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
          "border-sky-200 bg-sky-100 text-sky-700",
          "dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-400",
        ].join(" ")}>
          TatvaOps Platform
        </p>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
          {/* Left: headline + CTAs */}
          <div>
            <h1 className={[
              "max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl",
              "text-app",
              "dark:text-white dark:drop-shadow-[0_2px_32px_rgba(56,189,248,0.12)]",
            ].join(" ")}>
              AI-Powered Construction Content, Community, and Decision Support
            </h1>

            <p className={[
              "mt-5 max-w-2xl text-base leading-8 md:text-lg",
              "text-slate-600",
              "dark:text-slate-300",
            ].join(" ")}>
              TatvaOps combines a smart blog engine, practical city-wise cost guides, and a live
              forums community so builders, estimators, and teams can plan, discuss, and execute
              with confidence.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {/* Primary CTA */}
              <Link
                href="/blog"
                className={[
                  "inline-flex min-w-[150px] items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition",
                  "bg-sky-500 text-white hover:bg-sky-400",
                  "dark:bg-sky-400 dark:text-app dark:hover:bg-sky-300 dark:shadow-[0_0_16px_0_rgba(56,189,248,0.25)]",
                ].join(" ")}
              >
                Explore Blogs
              </Link>

              {/* Secondary CTA */}
              <Link
                href="/forums"
                className={[
                  "inline-flex min-w-[150px] items-center justify-center rounded-lg border px-5 py-2.5 text-sm font-semibold transition",
                  "border-slate-300 bg-surface text-slate-700 hover:bg-subtle",
                  "dark:border-slate-600 dark:bg-transparent dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800/50",
                ].join(" ")}
              >
                Join Forums
              </Link>
            </div>
          </div>

          {/* Right: feature mini-cards */}
          <div className="grid grid-cols-1 gap-4 self-end sm:grid-cols-3 lg:grid-cols-1">
            {[
              { title: "Blog Engine",    body: "AI-generated, SEO-structured, editable content." },
              { title: "Forums",         body: "Q&A, opinions, voting, and practical discussion." },
              { title: "Admin Control",  body: "CMS, moderation, autopopulate, and analytics." },
            ].map((card) => (
              <div
                key={card.title}
                className={[
                  "rounded-2xl border p-4 transition",
                  "border-app bg-surface",
                  "dark:border-slate-700/60 dark:bg-slate-800/60 dark:backdrop-blur-sm",
                ].join(" ")}
              >
                <p className="text-2xl font-bold text-app dark:text-white">{card.title}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className={[
        "mt-10 grid grid-cols-1 gap-4 rounded-2xl border p-5 shadow-sm sm:grid-cols-3",
        "border-app bg-surface",
        "dark:border-slate-700/50 dark:bg-slate-900/60",
      ].join(" ")}>
        {[
          { label: "What you get",  value: "Reliable construction knowledge base" },
          { label: "Who it helps",  value: "Contractors, planners, BOQ teams, founders" },
          { label: "How it works",  value: "AI generation + human moderation + community signals" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-subtle px-4 py-3 dark:bg-slate-800/50"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-bold text-app dark:text-slate-100">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── How TatvaOps Works ───────────────────────────────────────────── */}
      <section className={[
        "mt-10 rounded-2xl border p-6 shadow-sm",
        "border-app bg-surface",
        "dark:border-slate-700/50 dark:bg-slate-900/60",
      ].join(" ")}>
        <div className="mb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-400">Platform Intelligence</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-app dark:text-white">How TatvaOps works for you</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
              ),
              title: "Personalized recommendations",
              body: "The more you read, the smarter your feed gets. Content is ranked based on your reading history, engagement patterns, and topics you explore most.",
              accent: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ),
              title: "Community-reviewed accuracy",
              body: "Expert contributors (top 5% by reputation) review and approve edits. Every article shows its verification status and revision history — like Wikipedia, but for construction.",
              accent: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400",
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              ),
              title: "Intelligent content discovery",
              body: "Blogs, tutorials, forums, and short videos are connected by topic signals. Recommendations surface across content types based on what users with similar interests engage with.",
              accent: "text-sky-600 bg-sky-50 dark:bg-sky-900/30 dark:text-sky-400",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3 rounded-xl border border-app bg-subtle p-4 dark:bg-slate-800/40">
              <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${item.accent}`}>
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-app dark:text-white">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Smart discovery hub ───────────────────────────────────────────── */}
      <section className="mt-10 rounded-2xl border border-app bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">Smart Discovery Hub</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-app">Your connected knowledge workspace</h2>
          </div>
          <Link
            href="/ask"
            className="inline-flex items-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Ask AI anything on TatvaOps
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <article className="rounded-xl border border-app bg-subtle p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Continue Learning</h3>
            <ul className="mt-3 space-y-2">
              {continueLearning.map((tutorial) => (
                <li key={tutorial.slug}>
                  <Link href={`/tutorials/${tutorial.slug}`} className="text-sm font-semibold text-app hover:text-sky-700">
                    {tutorial.title}
                  </Link>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-app bg-subtle p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Recommended For You</h3>
            <ul className="mt-3 space-y-2">
              {recommendedForYou.map((blog) => (
                <li key={blog.slug}>
                  <Link href={`/blog/${blog.slug}`} className="text-sm font-semibold text-app hover:text-sky-700">
                    {blog.title}
                  </Link>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-app bg-subtle p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Trending Discussions</h3>
            <ul className="mt-3 space-y-2">
              {trendingForums.slice(0, 3).map((forum) => (
                <li key={forum.slug}>
                  <Link href={`/forums/${forum.slug}`} className="text-sm font-semibold text-app hover:text-sky-700">
                    {forum.title}
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_1.2fr]">
          <article className="rounded-xl border border-app bg-subtle p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Recently Updated</h3>
            <ul className="mt-3 space-y-2">
              {recentlyUpdated.map((blog) => (
                <li key={blog.slug}>
                  <Link href={`/blog/${blog.slug}`} className="text-sm font-semibold text-app hover:text-sky-700">
                    {blog.title}
                  </Link>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-app bg-subtle p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Popular Tutorials</h3>
            <ul className="mt-3 space-y-2">
              {tutorialsResult.slice(0, 3).map((tutorial) => (
                <li key={tutorial.slug}>
                  <Link href={`/tutorials/${tutorial.slug}`} className="text-sm font-semibold text-app hover:text-sky-700">
                    {tutorial.title}
                  </Link>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-gray-200 bg-surface p-4 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-600">Topic Explorer</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {topicHubs.map((tag) => (
                <Link
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-gray-200"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* ── Section heading ───────────────────────────────────────────────── */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight text-app dark:text-white md:text-3xl">
          What TatvaOps includes
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400 md:text-base">
          A complete construction content platform built to attract search traffic, answer practical
          site questions, and keep your publishing workflow fast and consistent.
        </p>
      </div>

      {/* ── Feature cards ─────────────────────────────────────────────────── */}
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
          <article
            key={feature.title}
            className={[
              "rounded-2xl border p-6 shadow-sm transition hover:-translate-y-0.5",
              "border-app bg-surface hover:shadow-md",
              "dark:border-slate-700/60 dark:bg-[#1e293b] dark:shadow-[var(--shadow-card)] dark:hover:border-slate-600 dark:hover:bg-[#263447] dark:hover:shadow-[var(--shadow-card-hover)]",
            ].join(" ")}
          >
            <h3 className="text-lg font-semibold text-app dark:text-white">
              {feature.title}
            </h3>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">
              {feature.body}
            </p>
          </article>
        ))}
      </div>

      {/* ── Bottom CTA strip ──────────────────────────────────────────────── */}
      <div className={[
        "mt-12 rounded-2xl border p-6 shadow-sm md:flex md:items-center md:justify-between md:gap-6",
        "border-app bg-surface",
        "dark:border-slate-700/50 dark:bg-slate-900/60",
      ].join(" ")}>
        <div>
          <h3 className="text-xl font-bold text-app dark:text-white">
            Start with what you need now
          </h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Read practical guides and jump into active discussions.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 md:mt-0">
          <Link
            href="/blog"
            className={[
              "inline-flex min-w-[140px] items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition",
              "bg-sky-500 text-white hover:bg-sky-400",
              "dark:bg-sky-400 dark:text-app dark:hover:bg-sky-300",
            ].join(" ")}
          >
            Go to Blog
          </Link>
          <Link
            href="/forums"
            className={[
              "inline-flex min-w-[140px] items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition",
              "border-slate-300 text-slate-700 hover:bg-subtle",
              "dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-800/50",
            ].join(" ")}
          >
            Go to Forums
          </Link>
        </div>
      </div>
    </section>
  );
}
