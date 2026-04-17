import Link from "next/link";
import type { UserProfile } from "@/lib/userProfileService";

type TopicActiveUsersStripProps = {
  title: string;
  users: UserProfile[];
};

export function TopicActiveUsersStrip({ title, users }: TopicActiveUsersStripProps) {
  if (users.length === 0) return null;
  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <Link href="/admin/blog" className="text-xs font-semibold text-sky-700 hover:underline">
          View all users
        </Link>
      </div>
      <div className="flex flex-wrap gap-3">
        {users.slice(0, 8).map((user) => (
          <Link
            key={user.id}
            href={user.last_forum_slug ? `/forums/${user.last_forum_slug}` : user.last_blog_slug ? `/blog/${user.last_blog_slug}` : "/forums"}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
          >
            <img src={user.avatar_url} alt={`${user.display_name} avatar`} className="h-6 w-6 rounded-full object-cover" />
            <span className="max-w-[130px] truncate font-medium">{user.display_name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
