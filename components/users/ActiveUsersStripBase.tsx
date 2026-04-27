import Link from "next/link";
import type { EngagedUserProfile, UserProfile } from "@/lib/userProfileService";
import { getUserAvatar } from "@/lib/identityUI";
import { getLevelFromReputationScore, getLevelMeta } from "@/lib/level";

type TopicActiveUsersStripProps = {
  title: string;
  users: Array<UserProfile | EngagedUserProfile>;
};

const TIER_CONFIG: Record<string, { label: string; className: string }> = {
  elite:       { label: "Elite",       className: "bg-purple-100 text-purple-700" },
  expert:      { label: "Expert",      className: "bg-amber-100 text-amber-700" },
  contributor: { label: "Contributor", className: "bg-sky-100 text-sky-700" },
  member:      { label: "Member",      className: "bg-slate-100 text-slate-500" },
};

export function ActiveUsersStripBase({ title, users }: TopicActiveUsersStripProps) {
  if (users.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-app bg-surface p-5 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600" aria-hidden>
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </span>
          <p className="text-sm font-bold text-app">{title}</p>
        </div>
        <p className="text-xs text-slate-500">No active users yet</p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-2xl border border-app bg-surface p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600" aria-hidden>
            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </span>
        <p className="text-sm font-bold text-app">{title}</p>
      </div>

      {/* User cards grid */}
      <div className="min-w-0 grid grid-cols-2 gap-2 sm:grid-cols-2">
        {users.slice(0, 8).map((user) => {
          const isLegacy = ("is_legacy" in user) && Boolean(user.is_legacy);
          const rep = user.reputation_score ?? 0;
          const engagement = ("engagement_score" in user ? user.engagement_score : 0) ?? 0;
          const tier = TIER_CONFIG[user.reputation_tier] ?? TIER_CONFIG.member!;
          const levelMeta = getLevelMeta(getLevelFromReputationScore(rep));
          const href = user.last_forum_slug
            ? `/forums/${user.last_forum_slug}`
            : user.last_blog_slug
              ? `/blog/${user.last_blog_slug}`
              : "/forums";

          return (
            <Link
              key={user.id}
              href={href}
              className={`group flex min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-app bg-subtle p-3 transition hover:border-sky-200 hover:bg-sky-50/40 hover:shadow-sm ${
                isLegacy ? "opacity-70" : ""
              }`}
            >
              {/* Avatar row */}
              <div className="flex items-center gap-2.5">
                <div className="relative flex-shrink-0">
                  <div className="transition-transform duration-200 hover:scale-105">
                    {(() => {
                      const avatar = getUserAvatar(user);
                      if (avatar.type === "initials") {
                        return (
                          <div
                            className={`h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-gradient-to-br ${avatar.gradient} border border-white/10 shadow-sm ring-1 ring-white/5`}
                          >
                            {avatar.name.slice(0, 2).toUpperCase()}
                          </div>
                        );
                      }
                      return (
                        <img
                          src={avatar.src}
                          alt={`${user.display_name} avatar`}
                          className={`h-9 w-9 rounded-full object-cover border border-white/10 shadow-sm ring-1 ring-white/5 ${
                            avatar.type === "dicebear" ? "opacity-90" : ""
                          }`}
                        />
                      );
                    })()}
                  </div>
                  {user.is_active_now && (
                    <span
                      className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
                      title="Active now"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-xs font-semibold text-slate-800 group-hover:text-sky-700">
                      {user.display_name}
                    </p>
                    {isLegacy && (
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-1.5 py-px text-[8px] font-medium uppercase tracking-wide text-slate-500">
                        Legacy
                      </span>
                    )}
                    <span
                      className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${
                        user.user_type === "REAL"
                          ? "bg-green-500"
                          : user.user_type === "ANONYMOUS"
                            ? "bg-gray-400"
                            : "bg-purple-500"
                      }`}
                      title={
                        isLegacy
                          ? "Legacy comment (untracked user)"
                          : user.user_type === "REAL"
                            ? "Real user (active)"
                            : user.user_type === "ANONYMOUS"
                              ? "Anonymous user"
                              : "System user (generated/imported)"
                      }
                    />
                    <span
                      className={`rounded-full px-1.5 py-px text-[8px] font-semibold ${
                        user.user_type === "REAL"
                          ? "border border-emerald-200 bg-emerald-100 text-emerald-700"
                          : user.user_type === "ANONYMOUS"
                            ? "border border-slate-200 bg-slate-100 text-slate-600"
                            : "border border-purple-200 bg-purple-100 text-purple-700"
                      }`}
                    >
                      {user.user_type === "REAL" ? "Real" : user.user_type === "ANONYMOUS" ? "Anonymous" : "System"}
                    </span>
                  </div>
                  <span className={`mt-0.5 inline-block rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide ${tier.className}`}>
                    {tier.label}
                  </span>
                  <span className={`mt-0.5 inline-block rounded px-1.5 py-px text-[9px] font-semibold ${levelMeta.color}`}>
                    {levelMeta.icon} {levelMeta.label}
                  </span>
                </div>
              </div>

              {/* About snippet */}
              <p className="line-clamp-2 text-[10px] leading-[1.5] text-slate-500">
                {user.about}
              </p>

              {/* Reputation score */}
              {rep > 0 ? (
                <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  {rep.toLocaleString()} pts
                </div>
              ) : engagement > 0 ? (
                <div className="flex items-center gap-1 text-[10px] font-semibold text-sky-600">
                  ⚡ {Math.round(engagement * 10)} engagement
                </div>
              ) : (
                <div className="text-[10px] text-slate-400">
                  New user
                </div>
              )}
              {("engagement_labels" in user) && user.engagement_labels.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {user.engagement_labels.map((label) => (
                    <span
                      key={`${user.id}-${label}`}
                      className="rounded-full border border-sky-100 bg-sky-50 px-1.5 py-px text-[9px] font-medium text-sky-700"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
