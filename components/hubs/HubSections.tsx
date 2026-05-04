import Link from "next/link";
import type { HubData } from "@/lib/hubs/getHubData";
import { humanizeHubSlug } from "@/lib/hubs/humanizeSlug";
import { HubForumsShowcase } from "@/components/hubs/HubForumsShowcase";

export function HubSections({ data }: { data: HubData }) {
  const { blogs, forums, hubKey } = data;
  const hubLabel = humanizeHubSlug(hubKey);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      <div className="min-w-0 flex-1">
        <HubForumsShowcase forums={forums} hubLabel={hubLabel} />
      </div>

      <aside className="shrink-0 lg:w-[min(100%,22rem)] xl:w-96">
        <article className="ui-card sticky top-24 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-app">Blog articles</h2>
            <p className="mt-1 text-xs text-muted">Guides and write-ups tagged with this hub.</p>
          </div>
          <ul className="space-y-4">
            {blogs.slice(0, 10).map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block rounded-lg border border-transparent p-2 -m-2 transition hover:border-black/[0.06] hover:bg-black/[0.02] dark:hover:border-white/10 dark:hover:bg-white/[0.04]">
                  <span className="line-clamp-2 text-sm font-semibold leading-snug text-app group-hover:text-sky-700 dark:group-hover:text-sky-400">
                    {post.title}
                  </span>
                  {post.excerpt ? (
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted dark:text-white/60">{post.excerpt}</p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-muted dark:text-white/50">
                    {post.author}
                    {post.created_at ? (
                      <>
                        {" · "}
                        {new Date(post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </>
                    ) : null}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {blogs.length === 0 ? (
            <p className="text-sm text-muted dark:text-white/60">No blog articles for this topic yet.</p>
          ) : null}
        </article>
      </aside>
    </div>
  );
}
