import Link from "next/link";
import type { EngagedUserProfile, UserProfile } from "@/lib/userProfileService";
import { getUserAvatar } from "@/lib/identityUI";
import { getLevelFromReputationScore, getLevelMeta } from "@/lib/level";

type TopicActiveUsersStripProps = {
  title: string;
  users: Array<UserProfile | EngagedUserProfile>;
};

const TIER_CONFIG: Record<string, { label: string; className: string }> = {
  elite:       { label: "Elite",       className: "bg-purple-500/15 text-purple-600 dark:text-purple-300" },
  expert:      { label: "Expert",      className: "bg-warning-soft text-warning-soft" },
  contributor: { label: "Contributor", className: "bg-info-soft text-info-soft" },
  member:      { label: "Member",      className: "bg-subtle text-muted" },
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

      {/* User cards list (sidebar-friendly) */}
      <div className="space-y-2.5">
        {users.slice(0, 8).map((user) => {
          const isLegacy = ("is_legacy" in user) && Boolean(user.is_legacy);
          const rep = user.reputation_score ?? 0;
          const engagement = ("engagement_score" in user ? user.engagement_score : 0) ?? 0;
          const tier = TIER_CONFIG[user.reputation_tier] ?? TIER_CONFIG.member!;
          const levelMeta = getLevelMeta(getLevelFromReputationScore(rep));
          const identityLabel = user.avatar_url ? "Real" : "Anonymous";
          const href = user.last_forum_slug
            ? `/forums/${user.last_forum_slug}`
            : user.last_blog_slug
              ? `/blog/${user.last_blog_slug}`
              : "/forums";
          const avatar = getUserAvatar(user);

          return (
            <Link
              key={user.id}
              href={href}
              className={`group flex flex-col gap-2.5 overflow-hidden rounded-xl border border-app bg-card p-3.5 shadow-[var(--shadow-card)] transition hover:border-info-soft hover:shadow-[var(--shadow-card-hover)] ${
                isLegacy ? "opacity-60" : ""
              }`}
            >
              {/* Avatar + name + identity + level */}
              <div className="flex items-start gap-3">
                <div className="relative flex-shrink-0">
                  {avatar.type === "initials" ? (
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm ${avatar.gradient}`}>
                      {avatar.name.slice(0, 2).toUpperCase()}
                    </div>
                  ) : (
                    <img
                      src={avatar.src}
                      alt={user.display_name}
                      className="h-9 w-9 rounded-full object-cover shadow-sm"
                    />
                  )}
                  {user.is_active_now && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-card" title="Active now" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight text-app group-hover:text-primary">
                    {user.display_name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-subtle px-2 py-0.5 text-[10px] font-medium text-muted">
                      {identityLabel}
                    </span>
                    <span className={`text-[11px] font-semibold ${levelMeta.color}`}>
                      {levelMeta.icon} {levelMeta.label}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tier.className}`}>
                      {tier.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* About */}
              {!isLegacy && user.about && !user.about.toLowerCase().startsWith("legacy") && (
                <p className="line-clamp-2 text-xs leading-relaxed text-muted">
                  {user.about}
                </p>
              )}

              {/* Bottom: only meaningful stat */}
              {engagement > 0 && (
                <div className="text-[11px] font-semibold text-info-soft">⚡ {Math.round(engagement * 10)} pts</div>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
