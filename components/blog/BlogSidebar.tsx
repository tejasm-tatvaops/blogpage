import Link from "next/link";
import type { BlogPost } from "@/lib/blogService";

type TocEntry = { text: string; anchor: string; level: number };

/** Extract H2 and H3 headings from raw markdown to build a Table of Contents. */
function extractToc(markdown: string): TocEntry[] {
  const lines = markdown.split("\n");
  const entries: TocEntry[] = [];

  for (const line of lines) {
    const h2 = line.match(/^## (.+)/);
    const h3 = line.match(/^### (.+)/);
    const match = h2 ?? h3;
    if (!match) continue;

    const text = match[1].trim();
    const anchor = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    entries.push({ text, anchor, level: h2 ? 2 : 3 });
  }

  return entries.slice(0, 12);
}

type BlogSidebarProps = {
  post: BlogPost;
  relatedPosts: BlogPost[];
  categories: string[];
};

export function BlogSidebar({ post, relatedPosts, categories }: BlogSidebarProps) {
  const toc = extractToc(post.content);

  return (
    <aside className="space-y-6">

      {/* Table of Contents */}
      {toc.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            In this article
          </h3>
          <nav>
            <ul className="space-y-1.5">
              {toc.map((entry) => (
                <li key={entry.anchor} className={entry.level === 3 ? "pl-3" : ""}>
                  <a
                    href={`#${entry.anchor}`}
                    className="block text-sm leading-snug text-slate-600 transition hover:text-slate-900"
                  >
                    {entry.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      {/* Topics / Categories */}
      {categories.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/blog?category=${encodeURIComponent(cat)}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  cat === post.category
                    ? "bg-slate-900 !text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Related reading
          </h3>
          <ul className="space-y-4">
            {relatedPosts.slice(0, 4).map((related) => (
              <li key={related.id}>
                <Link
                  href={`/blog/${related.slug}`}
                  className="group block"
                >
                  <p className="text-sm font-semibold leading-snug text-slate-800 transition group-hover:text-sky-700 line-clamp-2">
                    {related.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                    {related.excerpt}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* About TatvaOps */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white">
        <h3 className="mb-2 text-sm font-bold">About TatvaOps</h3>
        <p className="text-xs leading-5 text-slate-300">
          TatvaOps helps construction teams estimate smarter — with accurate BOQ workflows,
          vendor cost benchmarks, and procurement intelligence.
        </p>
        <Link
          href="/blog"
          className="mt-4 block rounded-lg bg-white/10 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-white/20"
        >
          Explore all articles →
        </Link>
      </div>

    </aside>
  );
}
