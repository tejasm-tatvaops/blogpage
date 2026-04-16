import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-[1500px] px-6 py-12 md:py-16">
      <div className="overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-8 text-slate-900 shadow-sm md:p-12">
        <p className="mb-4 inline-flex rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
          TatvaOps Platform
        </p>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
          <div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              AI-Powered Construction Content, Community, and Decision Support
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              TatvaOps combines a smart blog engine, practical city-wise cost guides, and a live
              forums community so builders, estimators, and teams can plan, discuss, and execute
              with confidence.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/blog"
                className="inline-flex min-w-[150px] items-center justify-center rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-sky-400"
              >
                Explore Blogs
              </Link>
              <Link
                href="/forums"
                className="inline-flex min-w-[150px] items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Join Forums
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 self-end sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-bold text-slate-900">Blog Engine</p>
              <p className="mt-1 text-sm text-slate-600">AI-generated, SEO-structured, editable content.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-bold text-slate-900">Forums</p>
              <p className="mt-1 text-sm text-slate-600">Q&A, opinions, voting, and practical discussion.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-bold text-slate-900">Admin Control</p>
              <p className="mt-1 text-sm text-slate-600">CMS, moderation, autopopulate, and analytics.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What you get</p>
          <p className="mt-1 text-lg font-bold text-slate-900">Reliable construction knowledge base</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Who it helps</p>
          <p className="mt-1 text-lg font-bold text-slate-900">Contractors, planners, BOQ teams, founders</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">How it works</p>
          <p className="mt-1 text-lg font-bold text-slate-900">AI generation + human moderation + community signals</p>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          What TatvaOps includes
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
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
          <article key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="text-lg font-semibold text-slate-900">{feature.title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">{feature.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex md:items-center md:justify-between md:gap-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Start with what you need now</h3>
          <p className="mt-2 text-sm text-slate-600">
            Read practical guides and jump into active discussions.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 md:mt-0">
          <Link
            href="/blog"
            className="inline-flex min-w-[140px] items-center justify-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-sky-800"
          >
            Go to Blog
          </Link>
          <Link
            href="/forums"
            className="inline-flex min-w-[140px] items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Go to Forums
          </Link>
        </div>
      </div>
    </section>
  );
}
