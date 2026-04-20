import Link from "next/link";

export default function HomePage() {
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
              "bg-sky-700 text-white hover:bg-sky-800",
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
