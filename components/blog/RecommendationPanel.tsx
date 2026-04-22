"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { BlogPost } from "@/lib/blogService";

// ── User profile (localStorage) ──────────────────────────────────────────────

type UserProfile = {
  viewedTags: Record<string, number>;     // tag → view count
  viewedCategories: Record<string, number>;
  viewedSlugs: string[];
};

const PROFILE_KEY = "tatvaops_user_profile";

export function getProfile(): UserProfile {
  if (typeof window === "undefined") return { viewedTags: {}, viewedCategories: {}, viewedSlugs: [] };
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") as UserProfile;
  } catch {
    return { viewedTags: {}, viewedCategories: {}, viewedSlugs: [] };
  }
}

export function recordView(post: { slug: string; tags: string[]; category: string }) {
  if (typeof window === "undefined") return;
  const p = getProfile();
  p.viewedTags ??= {};
  p.viewedCategories ??= {};
  p.viewedSlugs ??= [];

  for (const tag of post.tags) {
    p.viewedTags[tag] = (p.viewedTags[tag] ?? 0) + 1;
  }
  p.viewedCategories[post.category] = (p.viewedCategories[post.category] ?? 0) + 1;
  if (!p.viewedSlugs.includes(post.slug)) {
    p.viewedSlugs = [post.slug, ...p.viewedSlugs].slice(0, 50);
  }

  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

// ── Score posts against user profile ────────────────────────────────────────

function scorePosts(posts: BlogPost[], profile: UserProfile, currentSlug: string): BlogPost[] {
  const scored = posts
    .filter((p) => p.slug !== currentSlug && !profile.viewedSlugs?.includes(p.slug))
    .map((post) => {
      let score = 0;
      for (const tag of post.tags) score += (profile.viewedTags?.[tag] ?? 0) * 2;
      score += (profile.viewedCategories?.[post.category] ?? 0);
      return { post, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.post);

  return scored;
}

// ── Component ────────────────────────────────────────────────────────────────

type Props = { currentPost: BlogPost; allPosts: BlogPost[]; usePreRanked?: boolean };

export function RecommendationPanel({ currentPost, allPosts, usePreRanked = false }: Props) {
  const [recs, setRecs] = useState<BlogPost[]>([]);
  const [mounted, setMounted] = useState(false);
  const [whyTags, setWhyTags] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    const profile = getProfile();
    if (usePreRanked) {
      const filtered = allPosts.filter((p) => p.slug !== currentPost.slug).slice(0, 4);
      setRecs(filtered);
      // Compute matching tags between user's history and the recommended posts
      const userTopTags = Object.entries(profile.viewedTags ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([tag]) => tag);
      const matched = [...new Set(filtered.flatMap((p) => p.tags).filter((t) => userTopTags.includes(t)))].slice(0, 3);
      setWhyTags(matched);
      return;
    }
    const scored = scorePosts(allPosts, profile, currentPost.slug);
    setRecs(scored);
    // For locally-scored: show tags the user viewed that overlap with recommendations
    const userTopTags = Object.entries(profile.viewedTags ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([tag]) => tag);
    const matched = [...new Set(scored.flatMap((p) => p.tags).filter((t) => userTopTags.includes(t)))].slice(0, 3);
    setWhyTags(matched);
  }, [currentPost.slug, allPosts, usePreRanked]);

  useEffect(() => {
    if (!mounted || recs.length === 0) return;
    for (let i = 0; i < recs.length; i += 1) {
      const post = recs[i];
      void fetch("/api/feed/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "recommendation_impression",
          postSlug: post.slug,
          tags: post.tags,
          category: post.category,
          sourceContentType: "blog",
          targetContentType: "blog",
          position: i,
        }),
      }).catch(() => undefined);
    }
  }, [mounted, recs]);

  const recordRecommendationClick = async (post: BlogPost, position: number) => {
    try {
      await fetch("/api/feed/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "recommendation_click",
          postSlug: post.slug,
          tags: post.tags,
          category: post.category,
          sourceContentType: "blog",
          targetContentType: "blog",
          position,
        }),
      });
    } catch {
      // non-blocking analytics
    }
  };

  if (!mounted || recs.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-surface">
      <div className="flex items-center gap-2 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3.5">
        {usePreRanked ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500" aria-hidden>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700">Personalized for you</span>
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500" aria-hidden>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-indigo-700">Based on your activity</span>
          </>
        )}
      </div>
      {whyTags.length > 0 && (
        <div className="border-b border-indigo-50 bg-indigo-50/40 px-4 py-2">
          <p className="text-[10px] text-slate-500">
            Because you read{" "}
            {whyTags.map((tag, i) => (
              <span key={tag}>
                <span className="font-semibold text-indigo-600">#{tag}</span>
                {i < whyTags.length - 1 && <span className="text-slate-400">, </span>}
              </span>
            ))}
          </p>
        </div>
      )}
      <ul className="divide-y divide-slate-100">
        {recs.map((post, idx) => (
          <li key={post.id}>
            <Link
              href={`/blog/${post.slug}`}
              onClick={() => {
                void recordRecommendationClick(post, idx);
              }}
              className="group flex items-start gap-3 px-4 py-3.5 transition hover:bg-indigo-50/40"
            >
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 transition group-hover:bg-indigo-100">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 group-hover:text-indigo-600 transition" aria-hidden>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug text-slate-800 transition group-hover:text-indigo-700 line-clamp-2">
                  {post.title}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400 line-clamp-1">
                  {post.category} · {post.tags.slice(0, 2).join(", ")}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
