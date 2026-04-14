import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      <div className="overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-8 text-slate-900 shadow-sm md:p-12">
        <p className="mb-4 inline-flex rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
          TatvaOps Intelligence
        </p>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-10">
          <div>
            <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Build Smarter With Construction Insights That Drive Decisions
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
              Discover practical cost breakdowns, city-wise pricing trends, and tactical guidance
              for planning, procurement, and execution - all in one clean knowledge hub.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/blog"
                className="inline-flex min-w-[150px] items-center justify-center rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-sky-400"
              >
                Explore Blogs
              </Link>
              <Link
                href="/admin/blog"
                className="inline-flex min-w-[150px] items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open CMS
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 self-end sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-bold text-slate-900">AI-first</p>
              <p className="mt-1 text-sm text-slate-600">Groq-powered generation with fallbacks.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-bold text-slate-900">SEO-ready</p>
              <p className="mt-1 text-sm text-slate-600">Structured content for high-intent traffic.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-bold text-slate-900">Actionable</p>
              <p className="mt-1 text-sm text-slate-600">Practical guidance teams can execute fast.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coverage</p>
          <p className="mt-1 text-lg font-bold text-slate-900">Multi-city construction trends</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Content Depth</p>
          <p className="mt-1 text-lg font-bold text-slate-900">Long-form guides + references</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Publishing</p>
          <p className="mt-1 text-lg font-bold text-slate-900">Admin CMS with automation</p>
        </div>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
          Why teams choose TatvaOps Blog
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
          Designed for decision-makers who need reliable estimates, practical execution advice, and
          consistent publishing quality.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <h3 className="text-lg font-semibold text-slate-900">Cost Intelligence</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Breakdown labor, materials, and regional price movements with actionable context for
            project planning.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <h3 className="text-lg font-semibold text-slate-900">AI + Editorial Quality</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Generate high-quality posts with structured sections, references, and clean readability
            for both users and search engines.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <h3 className="text-lg font-semibold text-slate-900">Operational Speed</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Publish fast through a focused admin workflow with bulk generation, moderation, and
            analytics-friendly content.
          </p>
        </article>
      </div>

      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex md:items-center md:justify-between md:gap-6">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Start exploring practical guides</h3>
          <p className="mt-2 text-sm text-slate-600">
            Read the latest location-based insights or open the CMS to generate and manage content.
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
            href="/admin/blog"
            className="inline-flex min-w-[140px] items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Manage Content
          </Link>
        </div>
      </div>
    </section>
  );
}
