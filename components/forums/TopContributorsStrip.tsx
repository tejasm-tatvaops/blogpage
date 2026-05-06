"use client";

import Link from "next/link";
import type { Comment } from "@/lib/services/comment.service";
import { getUserAvatar } from "@/lib/identityUI";
import { resolveContextualIdentity } from "@/lib/expertiseContext";
import { ExpertiseBadge } from "@/components/shared/ExpertiseBadge";

type TopContributorsStripProps = {
  comments: Comment[];
  tags: string[];
};

function flattenComments(comments: Comment[]): Comment[] {
  const out: Comment[] = [];
  for (const c of comments) {
    out.push(c);
    for (const r of c.replies) {
      out.push(r);
      for (const n of r.replies) out.push(n);
    }
  }
  return out;
}

export function TopContributorsStrip({ comments, tags }: TopContributorsStripProps) {
  const flat = flattenComments(comments).filter((c) => !c.is_deleted && c.identity_key);
  if (flat.length < 2) return null;

  const byUser = new Map<string, { key: string; name: string; score: number; count: number; topCommentScore: number; badge: string | null; profession: string | null; expertise: string | null }>();
  for (const c of flat) {
    const key = String(c.identity_key ?? "");
    if (!key) continue;
    const existing = byUser.get(key) ?? {
      key,
      name: c.username || c.author_name || "Member",
      score: 0,
      count: 0,
      topCommentScore: Number.MIN_SAFE_INTEGER,
      badge: c.expertise_badge ?? null,
      profession: c.profession ?? null,
      expertise: c.expertise ?? null,
    };
    existing.count += 1;
    existing.score += Math.max(0, c.score) + 2;
    existing.topCommentScore = Math.max(existing.topCommentScore, c.score);
    byUser.set(key, existing);
  }

  const top = [...byUser.values()].sort((a, b) => b.score - a.score).slice(0, 3);
  if (top.length === 0) return null;

  const contributionType = (item: { count: number; topCommentScore: number }): string => {
    if (item.topCommentScore >= 10) return "Most detailed insights";
    if (item.count >= 3) return "Most active contributor";
    return "Helpful discussion input";
  };

  return (
    <section className="mb-5 rounded-xl border border-app bg-subtle p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">Top contributors in this thread</p>
      <div className="mt-2 grid gap-2 md:grid-cols-3">
        {top.map((item) => {
          const identity = resolveContextualIdentity({
            baseBadge: item.badge,
            profession: item.profession,
            expertise: item.expertise,
            contextTags: tags,
          });
          const avatar = getUserAvatar({ identity_key: item.key, display_name: item.name });
          return (
            <Link key={item.key} href={`/user/${encodeURIComponent(item.key)}`} className="rounded-lg border border-app bg-surface p-2 hover:border-orange-400/50">
              <div className="flex items-center gap-2">
                {avatar.type === "initials" ? (
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white bg-gradient-to-br ${avatar.gradient}`}>
                    {avatar.name.slice(0, 2).toUpperCase()}
                  </div>
                ) : (
                  <img src={avatar.src} alt={item.name} className="h-7 w-7 rounded-full object-cover" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-app">{item.name}</p>
                  <p className="text-[11px] text-slate-500">{contributionType(item)}</p>
                </div>
              </div>
              <div className="mt-1">
                <ExpertiseBadge badge={identity.label} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
