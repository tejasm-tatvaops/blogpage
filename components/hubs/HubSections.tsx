import Link from "next/link";
import type { HubData } from "@/lib/hubs/getHubData";
import { humanizeHubSlug } from "@/lib/hubs/humanizeSlug";
import { HubForumsShowcase } from "@/components/hubs/HubForumsShowcase";

export function HubSections({ data }: { data: HubData }) {
  const { blogs, forums, hubKey, displayTitle } = data;
  const hubLabel = displayTitle?.trim() || humanizeHubSlug(hubKey);

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      <div className="min-w-0 flex-1">
        <HubForumsShowcase forums={forums} hubLabel={hubLabel} />
      </div>

      <aside className="shrink-0 lg:w-[min(100%,22rem)] xl:w-96">
        <article className="ui-card sticky top-24 rounded-xl p-5">
          <div className="mb-4">
            <h2 className="font-serif text-[1.4rem] font-medium leading-tight tracking-tight text-app">Blog articles</h2>
            <p className="mt-1 font-sans text-[0.78rem] font-normal leading-[1.5] text-muted">
              Guides and write-ups tagged with this hub.
            </p>
          </div>
          <ul className="space-y-4">
            {blogs.slice(0, 10).map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="group block rounded-lg border border-transparent p-2 -m-2 transition hover:border-black/[0.06] hover:bg-black/[0.02] dark:hover:border-white/10 dark:hover:bg-white/[0.04]">
                  <span className="line-clamp-2 font-sans text-[0.9rem] font-semibold leading-tight text-app group-hover:text-sky-700 dark:group-hover:text-sky-400">
                    {post.title}
                  </span>
                  {post.excerpt ? (
                    <p className="mt-1 line-clamp-2 font-sans text-[0.78rem] font-normal leading-[1.5] text-muted dark:text-white/60">
                      {post.excerpt}
                    </p>
                  ) : null}
                  <p className="mt-2 font-sans leading-none text-muted dark:text-white/50">
                    <span className="text-[0.62rem] font-medium text-app/90 dark:text-white/75">{post.author}</span>
                    {post.created_at ? (
                      <>
                        <span className="text-[0.56rem] font-normal">{" · "}</span>
                        <span className="text-[0.56rem] font-normal">
                          {new Date(post.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </>
                    ) : null}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {blogs.length === 0 ? (
            <p className="font-sans text-[0.78rem] font-normal leading-[1.5] text-muted dark:text-white/60">
              No blog articles for this topic yet.
            </p>
          ) : null}
        </article>
      </aside>
    </div>
  );
}
