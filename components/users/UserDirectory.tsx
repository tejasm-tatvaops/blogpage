import Link from "next/link";
import type { UserProfile } from "@/lib/userProfileService";

type UserDirectoryProps = {
  users: UserProfile[];
  totals?: {
    blogViews: number;
    forumViews: number;
  };
};

const formatNumber = (value: number): string => new Intl.NumberFormat("en-US").format(value);

export function UserDirectory({ users, totals }: UserDirectoryProps) {
  const safeTotals = totals ?? { blogViews: 0, forumViews: 0 };

  return (
    <section className="mx-auto w-full max-w-[1500px] px-6 py-12">
      <header className="mb-10 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Users</h1>
        <p className="mt-3 text-base leading-8 text-slate-600">
          A live directory of readers and contributors who have interacted with TatvaOps through blog
          reading, comments, forum discussions, and community activity.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Blog Views (DB)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatNumber(safeTotals.blogViews)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-400">Forum Views (DB)</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatNumber(safeTotals.forumViews)}</p>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-8 py-14 text-center text-slate-600">
          No user profiles yet. Once visitors start reading blogs or joining discussions, they will show up here.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <article
              key={user.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <img
                  src={user.avatar_url}
                  alt={`${user.display_name} avatar`}
                  className="h-16 w-16 rounded-full border border-slate-200 bg-slate-50 object-cover shadow-sm"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-xl font-semibold text-slate-900">{user.display_name}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{user.about}</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Blog views</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(user.blog_views)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Blog comments</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(user.blog_comments)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Forum posts</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(user.forum_posts)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Forum activity</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {formatNumber(user.forum_comments + user.forum_votes)}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2 text-sm text-slate-500">
                {user.last_blog_slug ? (
                  <p>
                    Last blog:
                    {" "}
                    <Link href={`/blog/${user.last_blog_slug}`} className="font-medium text-sky-700 hover:underline">
                      {user.last_blog_slug}
                    </Link>
                  </p>
                ) : null}
                {user.last_forum_slug ? (
                  <p>
                    Last forum:
                    {" "}
                    <Link href={`/forums/${user.last_forum_slug}`} className="font-medium text-sky-700 hover:underline">
                      {user.last_forum_slug}
                    </Link>
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
