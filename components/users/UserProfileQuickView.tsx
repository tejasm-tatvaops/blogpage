"use client";

import { useEffect, useState } from "react";
import type { UserProfile } from "@/lib/userProfileService";

type UserProfileQuickViewProps = {
  displayName: string;
  trigger: React.ReactNode;
};

const formatNumber = (value: number): string => new Intl.NumberFormat("en-US").format(value);

export function UserProfileQuickView({ displayName, trigger }: UserProfileQuickViewProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/users/profile?name=${encodeURIComponent(displayName)}`, {
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
  }, [displayName, open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="contents">
        {trigger}
      </button>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <p className="text-sm font-semibold text-slate-900">User profile</p>
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
                  <img src={user.avatar_url} alt={`${user.display_name} avatar`} className="h-14 w-14 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-900">{user.display_name}</p>
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">{user.about}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
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
                  <div className="rounded-lg bg-slate-50 px-2 py-2">
                    <p className="text-[10px] uppercase text-slate-400">Blog views</p>
                    <p className="text-sm font-semibold text-slate-900">{formatNumber(user.blog_views)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2 py-2">
                    <p className="text-[10px] uppercase text-slate-400">Forum posts</p>
                    <p className="text-sm font-semibold text-slate-900">{formatNumber(user.forum_posts)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2 py-2">
                    <p className="text-[10px] uppercase text-slate-400">Forum comments</p>
                    <p className="text-sm font-semibold text-slate-900">{formatNumber(user.forum_comments)}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
