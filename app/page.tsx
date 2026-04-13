import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 shadow-sm md:p-12">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
          TatvaOps Platform
        </p>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
          Construction Cost Intelligence Platform
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
          AI-powered blog and estimation tools for builders and homeowners to plan better, procure
          smarter, and execute with confidence.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/blog"
            className="inline-flex items-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Read Blogs
          </Link>
          <Link
            href="/estimate"
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Try Estimate Tool
          </Link>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Blog System</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            High-quality construction guides with SEO metadata, structured content, and conversion-focused CTAs.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">AI Generation</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Generate long-form, location-aware posts with structured sections, FAQs, and internal linking.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Cost Estimation</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Move from rough assumptions to actionable estimate ranges that support better decisions.
          </p>
        </article>
      </div>
    </section>
  );
}
