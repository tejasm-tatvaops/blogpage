import Link from "next/link";
import type { BlogPost } from "@/lib/blogService";
import { BlogCard } from "./BlogCard";

type BlogListProps = {
  posts: BlogPost[];
  categories: string[];
  activeCategory?: string;
};

export function BlogList({ posts, categories, activeCategory }: BlogListProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-10 flex flex-col gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">TatvaOps Blog</h1>
          <p className="mt-3 max-w-3xl text-base leading-8 text-slate-600">
            Tactical insights on BOQ workflows, construction estimation, procurement strategy, and
            vendor decisions to help teams execute with confidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-6">
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/blog"
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                !activeCategory ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={`/blog?category=${encodeURIComponent(category)}`}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  activeCategory === category
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {category}
              </Link>
            ))}
          </div>

          <Link
            href="/estimate"
            className="inline-flex items-center justify-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            Get your construction estimate
          </Link>
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-600">
          No published articles found{activeCategory ? ` in "${activeCategory}"` : ""}.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
