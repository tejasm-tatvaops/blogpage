"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { UserProfile } from "@/lib/userProfileService";
import { getUserAvatar } from "@/lib/identityUI";
import { ExpertiseBadge } from "@/components/shared/ExpertiseBadge";

type UserProfileQuickViewProps = {
  identityKey: string;
  displayName: string;
  trigger: React.ReactNode;
};

const formatNumber = (value: number): string => new Intl.NumberFormat("en-US").format(value);

function UserTypeBadge({ userType }: { userType: UserProfile["user_type"] }) {
  if (userType === "REAL") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        Real
      </span>
    );
  }
  if (userType === "ANONYMOUS") {
    return (
      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
        Anonymous
      </span>
    );
  }
  return (
    <span className="rounded-full border border-purple-200 bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
      System
    </span>
  );
}

export function UserProfileQuickView({ displayName, identityKey, trigger }: UserProfileQuickViewProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminOverrideBadge, setAdminOverrideBadge] = useState("");
  const [adminBadgeOptions, setAdminBadgeOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/users/profile?identity=${encodeURIComponent(identityKey)}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json()) as { user?: UserProfile | null };
        if (!cancelled) setUser(payload.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [identityKey, open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const payload = (await response.json()) as { isAdmin?: boolean };
        const adminState = Boolean(payload.isAdmin);
        if (!cancelled) setIsAdmin(adminState);
        if (adminState) {
          const cfg = await fetch("/api/admin/expertise-config", { cache: "no-store" });
          const cfgPayload = (await cfg.json().catch(() => ({}))) as { badgeLabels?: string[] };
          if (!cancelled) setAdminBadgeOptions(Array.isArray(cfgPayload.badgeLabels) ? cfgPayload.badgeLabels : []);
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    setAdminOverrideBadge(user?.expertise_badge ?? "");
  }, [user?.expertise_badge]);

  const trendLabel = (() => {
    if (!user) return null;
    const helpful = user.forum_comments + user.blog_comments + user.forum_posts;
    if (helpful >= 30) return "↗ Trusted contributor";
    if (helpful >= 12) return "Consistently helpful this month";
    return null;
  })();

  const badgeReasonLines = user?.expertise_badge
    ? [
      user.profession ? `${user.profession} identity configured` : null,
      user.expertise ? `${user.expertise} specialization selected` : null,
      user.reputation_score > 0 ? `Reputation score ${user.reputation_score}` : null,
      user.forum_comments + user.blog_comments > 0
        ? `${user.forum_comments + user.blog_comments} community discussion contributions`
        : null,
    ].filter(Boolean) as string[]
    : [];

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="contents">
        {trigger}
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-app bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <p className="text-sm font-semibold text-app">User profile</p>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1 text-slate-500 hover:bg-slate-100">
                ✕
              </button>
            </div>

            {loading ? (
              <div className="space-y-3">
                <div className="h-14 w-14 animate-pulse rounded-full bg-slate-200" />
                <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
              </div>
            ) : !user ? (
              <p className="text-sm text-slate-600">No profile found yet for {displayName}.</p>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="transition-transform duration-200 hover:scale-105">
                    {(() => {
                      const avatar = getUserAvatar(user);
                      if (avatar.type === "initials") {
                        return (
                          <div
                            className={`h-14 w-14 rounded-full flex items-center justify-center text-white text-base font-semibold bg-gradient-to-br ${avatar.gradient} border border-white/10 shadow-sm ring-1 ring-white/5`}
                          >
                            {avatar.name.slice(0, 2).toUpperCase()}
                          </div>
                        );
                      }
                      return (
                        <img
                          src={avatar.src}
                          alt={`${user.display_name} avatar`}
                          className={`h-14 w-14 rounded-full object-cover border border-white/10 shadow-sm ring-1 ring-white/5 ${
                            avatar.type === "dicebear" ? "opacity-90" : ""
                          }`}
                        />
                      );
                    })()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-app">{user.display_name}</p>
                    {user.username ? (
                      <p className="mt-0.5 text-xs font-medium text-sky-700">@{user.username}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">{user.about}</p>
                    <Link
                      href={`/user/${encodeURIComponent(user.identity_key)}`}
                      className="mt-1 inline-block text-xs font-medium text-sky-700 hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      Open full profile
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <UserTypeBadge userType={user.user_type} />
                      <span title={badgeReasonLines.length > 0 ? `Based on:\n• ${badgeReasonLines.join("\n• ")}` : undefined}>
                        <ExpertiseBadge badge={user.expertise_badge} />
                      </span>
                      {trendLabel ? (
                        <span className="rounded-full border border-emerald-200/70 bg-emerald-50/80 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                          {trendLabel}
                        </span>
                      ) : null}
                      {user.is_active_now ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Active now
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Seen recently
                        </span>
                      )}
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                        Tone: {user.writing_tone}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-subtle px-2 py-2">
                    <p className="text-[10px] uppercase text-slate-400">Blog views</p>
                    <p className="text-sm font-semibold text-app">{formatNumber(user.blog_views)}</p>
                  </div>
                  <div className="rounded-lg bg-subtle px-2 py-2">
                    <p className="text-[10px] uppercase text-slate-400">Forum posts</p>
                    <p className="text-sm font-semibold text-app">{formatNumber(user.forum_posts)}</p>
                  </div>
                  <div className="rounded-lg bg-subtle px-2 py-2">
                    <p className="text-[10px] uppercase text-slate-400">Forum comments</p>
                    <p className="text-sm font-semibold text-app">{formatNumber(user.forum_comments)}</p>
                  </div>
                </div>
                {isAdmin ? (
                  <div className="mt-4 rounded-xl border border-app bg-subtle p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-app">Admin Controls</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={adminBusy || !user.identity_key}
                        onClick={async () => {
                          if (!user.identity_key || adminBusy) return;
                          setAdminBusy(true);
                          try {
                            await fetch("/api/admin/users/expertise", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ identityKey: user.identity_key, disabled: true }),
                            });
                            setUser((prev) => (prev ? { ...prev, public_expertise_enabled: false, expertise_badge: null } : prev));
                          } finally {
                            setAdminBusy(false);
                          }
                        }}
                        className="rounded-md border border-app px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Disable Public Expertise
                      </button>
                      <button
                        type="button"
                        disabled={adminBusy || !user.identity_key}
                        onClick={async () => {
                          if (!user.identity_key || adminBusy) return;
                          setAdminBusy(true);
                          try {
                            await fetch("/api/admin/users/expertise", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ identityKey: user.identity_key, disabled: false }),
                            });
                            setUser((prev) => (prev ? { ...prev, public_expertise_enabled: true } : prev));
                          } finally {
                            setAdminBusy(false);
                          }
                        }}
                        className="rounded-md border border-app px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        Enable Public Expertise
                      </button>
                      <select
                        value={adminOverrideBadge}
                        onChange={(event) => setAdminOverrideBadge(event.target.value)}
                        className="rounded-md border border-app bg-surface px-2 py-1 text-[11px] text-app"
                      >
                        <option value="">No override badge</option>
                        {adminBadgeOptions.map((badge) => <option key={badge} value={badge}>{badge}</option>)}
                      </select>
                      <button
                        type="button"
                        disabled={adminBusy || !user.identity_key}
                        onClick={async () => {
                          if (!user.identity_key || adminBusy) return;
                          setAdminBusy(true);
                          try {
                            await fetch("/api/admin/users/expertise", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ identityKey: user.identity_key, adminOverrideBadge: adminOverrideBadge || null }),
                            });
                            setUser((prev) => (prev ? { ...prev, expertise_badge: adminOverrideBadge || prev.expertise_badge } : prev));
                          } finally {
                            setAdminBusy(false);
                          }
                        }}
                        className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50"
                      >
                        Apply Override
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
