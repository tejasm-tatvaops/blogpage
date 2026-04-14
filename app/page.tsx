import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white p-8 shadow-sm md:p-12">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">
          TatvaOps Platform
        </p>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-6xl">
          Construction Cost Intelligence Platform
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
          AI-powered blog publishing for builders and homeowners to plan better, procure smarter,
          and execute with confidence.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/blog"
            className="inline-flex min-w-[140px] items-center justify-center rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold !text-white shadow-sm transition hover:bg-sky-800"
          >
            Read Blogs
          </Link>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <h2 className="text-xl font-semibold text-slate-900">Blog System</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            High-quality construction guides with SEO metadata, structured content, and conversion-focused CTAs.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <h2 className="text-xl font-semibold text-slate-900">AI Generation</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Generate long-form, location-aware posts with structured sections, FAQs, and internal linking.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <h2 className="text-xl font-semibold text-slate-900">SEO Content Engine</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Publish high-intent construction content consistently with strong structure, metadata, and discoverability.
          </p>
        </article>
      </div>
    </section>
  );
}
