"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getUserAvatar } from "@/lib/identityUI";
import type { UserProfile } from "@/lib/userProfileService";
import { FollowButton } from "@/components/user/FollowButton";
import {
  COMPANY_TYPES,
  EXPERIENCE_LEVELS,
} from "@/lib/expertiseIdentity";
import { ExpertiseBadge } from "@/components/shared/ExpertiseBadge";
import type { SiteJournalProject } from "@/data/siteJournals";

type PublicUserProfileProps = {
  user: UserProfile;
  initialFollowers: number;
  initialFollowing: number;
};

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);

const typeClassMap: Record<UserProfile["user_type"], string> = {
  REAL: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ANONYMOUS: "border-slate-200 bg-slate-100 text-slate-700",
  SYSTEM: "border-purple-200 bg-purple-50 text-purple-700",
};

const tierClassMap: Record<string, string> = {
  member: "border-slate-200 bg-slate-50 text-slate-700",
  contributor: "border-sky-200 bg-sky-50 text-sky-700",
  expert: "border-violet-200 bg-violet-50 text-violet-700",
  elite: "border-amber-200 bg-amber-50 text-amber-700",
};

const tierOrder = ["member", "contributor", "expert", "elite"] as const;
const tierThresholds: Record<(typeof tierOrder)[number], number> = {
  member: 0,
  contributor: 100,
  expert: 500,
  elite: 2000,
};

const cityKeywords = ["hyderabad", "bangalore", "bengaluru", "pune", "chennai", "mumbai", "delhi", "gurgaon", "noida"];

type ExpertiseArea = { label: string; score: number };
type ContributionCard = { title: string; href: string; type: string; metric: string; context: string };

const toTitleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

export function PublicUserProfile({
  user,
  initialFollowers,
  initialFollowing,
}: PublicUserProfileProps) {
  const [followers, setFollowers] = useState(initialFollowers);
  const [identityOptions, setIdentityOptions] = useState<{ professions: string[]; expertiseAreas: string[] }>({
    professions: [],
    expertiseAreas: [],
  });
  const [profileData, setProfileData] = useState({
    username: user.username ?? "",
    bio: user.bio ?? "",
    location: user.location ?? "",
    website: user.website ?? "",
    email: "",
    email_verified: false,
    phone: "",
    phone_verified: false,
    profession: user.profession ?? "",
    expertise: user.expertise ?? "",
    yearsOfExperience: user.years_of_experience ?? "",
    companyType: user.company_type ?? "",
    verificationPreference: user.verification_preference ?? "none",
    publicExpertiseEnabled: Boolean(user.public_expertise_enabled),
    expertiseBadge: user.expertise_badge ?? "",
  });
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(profileData);
  const [savingProfile, setSavingProfile] = useState(false);
  const [siteJournalContributions, setSiteJournalContributions] = useState<SiteJournalProject[]>([]);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<{
    email: { sending: boolean; verifying: boolean; sent: boolean; code: string; error: string | null; success: string | null };
    phone: { sending: boolean; verifying: boolean; sent: boolean; code: string; error: string | null; success: string | null };
  }>({
    email: { sending: false, verifying: false, sent: false, code: "", error: null, success: null },
    phone: { sending: false, verifying: false, sent: false, code: "", error: null, success: null },
  });
  const avatar = getUserAvatar(user);
  const { data: session } = useSession();
  const viewerIdentityKey = session?.user?.id ? `google:${session.user.id}` : "";
  const isOwnProfile = viewerIdentityKey !== "" && viewerIdentityKey === user.identity_key;
  const publicBio = profileData.bio || user.about || "No bio yet.";
  const profileHeadlineName = useMemo(() => {
    const username = String(profileData.username ?? "").trim();
    if (username) return username;

    const userName = String(user.username ?? "").trim();
    if (userName) return userName;

    if (isOwnProfile) {
      const sessionName = String(session?.user?.name ?? "").trim();
      if (sessionName) return sessionName;
    }

    const identityTail = String(user.identity_key ?? "").split(":").slice(1).join(":").trim();
    if (identityTail.includes("@")) {
      const localPart = identityTail.split("@")[0]?.trim();
      if (localPart) return localPart;
    }

    return user.display_name;
  }, [isOwnProfile, profileData.username, session?.user?.name, user.display_name, user.identity_key, user.username]);
  const currentTierIndex = Math.max(0, tierOrder.indexOf((user.reputation_tier || "member") as (typeof tierOrder)[number]));
  const nextTier = tierOrder[Math.min(currentTierIndex + 1, tierOrder.length - 1)];
  const progressBase = tierThresholds[tierOrder[currentTierIndex]];
  const progressCeil = tierThresholds[nextTier];
  const reputationProgress = progressCeil > progressBase
    ? Math.min(100, Math.max(0, ((user.reputation_score - progressBase) / (progressCeil - progressBase)) * 100))
    : 100;
  const topInterestTags = useMemo(
    () =>
      Object.entries(user.interest_tags ?? {})
        .filter(([, score]) => Number(score) > 0)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 8)
        .map(([tag]) => toTitleCase(tag.replace(/[-_]/g, " "))),
    [user.interest_tags],
  );

  const inferredMarkets = useMemo(() => {
    const fromLocation = (profileData.location || user.location || "")
      .split(/[,/&-]/)
      .map((part) => part.trim())
      .filter(Boolean);
    const fromTags = topInterestTags.filter((tag) => cityKeywords.some((city) => tag.toLowerCase().includes(city)));
    return [...new Set([...fromLocation, ...fromTags])].slice(0, 4);
  }, [profileData.location, topInterestTags, user.location]);

  const expertiseAreas = useMemo<ExpertiseArea[]>(() => {
    const map = new Map<string, number>();
    if (profileData.expertise) map.set(profileData.expertise, 90);
    if (profileData.profession) map.set(profileData.profession, 64);
    topInterestTags.slice(0, 6).forEach((tag, index) => {
      const base = Math.max(30, 85 - index * 10);
      map.set(tag, Math.max(base, map.get(tag) ?? 0));
    });
    if (map.size === 0) {
      map.set("Construction Discussions", 72);
      map.set("Project Planning", 58);
      map.set("Execution Insights", 46);
    }
    return [...map.entries()]
      .map(([label, score]) => ({ label, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [profileData.expertise, profileData.profession, topInterestTags]);

  const knownFor = useMemo(() => {
    const chips: string[] = [];
    if (profileData.expertise) chips.push(`${profileData.expertise} insights`);
    if (profileData.profession) chips.push(`${profileData.profession} perspective`);
    chips.push(...topInterestTags.slice(0, 5).map((tag) => `${tag} discussions`));
    if (user.forum_quality_streak_days >= 5) chips.push("Consistently helpful contributions");
    if (user.forum_badges.length) chips.push(...user.forum_badges.slice(0, 2));
    return [...new Set(chips)].slice(0, 7);
  }, [profileData.expertise, profileData.profession, topInterestTags, user.forum_badges, user.forum_quality_streak_days]);

  const aiSummary = useMemo(() => {
    const identity = profileData.profession || "construction contributor";
    const domain = profileData.expertise || topInterestTags[0] || "practical project delivery";
    const behaviorLine = user.forum_quality_streak_days >= 5
      ? "Their recent activity shows consistently helpful participation in high-signal discussions."
      : "They contribute steadily across platform discussions with a practical and implementation-focused style.";
    const marketLine = inferredMarkets.length ? `Active context includes ${inferredMarkets.join(", ")}.` : "";
    return `${profileHeadlineName} consistently contributes ${domain.toLowerCase()} intelligence as a ${identity}. ${behaviorLine} ${marketLine}`.trim();
  }, [
    inferredMarkets,
    profileData.expertise,
    profileData.profession,
    profileHeadlineName,
    topInterestTags,
    user.forum_quality_streak_days,
  ]);

  const topContributions = useMemo<ContributionCard[]>(() => {
    const cards: ContributionCard[] = [];
    if (user.last_forum_slug) {
      cards.push({
        title: `Discussion contribution: ${toTitleCase(user.last_forum_slug.replace(/-/g, " "))}`,
        href: `/forums/${user.last_forum_slug}`,
        type: "Forum",
        metric: `${formatNumber(user.forum_comments + user.forum_votes)} engagement signals`,
        context: "Most discussed and active thread context",
      });
    }
    if (user.last_blog_slug) {
      cards.push({
        title: `Knowledge post: ${toTitleCase(user.last_blog_slug.replace(/-/g, " "))}`,
        href: `/blog/${user.last_blog_slug}`,
        type: "Blog",
        metric: `${formatNumber(user.blog_views)} profile-attributed views`,
        context: "High-read contribution in the content graph",
      });
    }
    cards.push({
      title: "Forum participation footprint",
      href: "/forums",
      type: "Forum",
      metric: `${formatNumber(user.forum_posts)} posts • ${formatNumber(user.forum_comments)} comments`,
      context: "Sustained discussion depth and response quality",
    });
    cards.push({
      title: "Construction intelligence activity",
      href: "/inshorts",
      type: "Inshorts",
      metric: `${formatNumber(user.blog_comments + user.forum_comments)} total comment contributions`,
      context: "Signals practical expertise across formats",
    });
    return cards.slice(0, 4);
  }, [
    user.last_forum_slug,
    user.last_blog_slug,
    user.forum_comments,
    user.forum_votes,
    user.blog_views,
    user.forum_posts,
    user.blog_comments,
  ]);

  const siteJournalSpecialties = useMemo(() => {
    const tags = siteJournalContributions.flatMap((journal) => journal.tags);
    const counts = new Map<string, number>();
    tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag]) => toTitleCase(tag.replace(/[-_]/g, " ")));
  }, [siteJournalContributions]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const params = new URLSearchParams({
          ownerId: user.identity_key,
          includeUnpublished: "true",
        });
        const response = await fetch(`/api/site-journals?${params.toString()}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as { journals?: SiteJournalProject[] };
        if (!response.ok || !Array.isArray(payload.journals)) return;
        if (!cancelled) setSiteJournalContributions(payload.journals.slice(0, 5));
      } catch {
        // keep empty fallback
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [user.identity_key]);

  const activityTimeline = useMemo(() => {
    const timeline: Array<{ label: string; meta: string }> = [];
    if (siteJournalContributions.length > 0) {
      timeline.push({ label: "Published a Site Journal", meta: siteJournalContributions[0]?.title ?? "Site Journal update" });
      timeline.push({ label: "Added procurement field note", meta: siteJournalContributions[0]?.aiRiskPulse ?? "Operational execution signal" });
    }
    if (user.last_forum_slug) timeline.push({ label: "Answered in a forum discussion", meta: toTitleCase(user.last_forum_slug.replace(/-/g, " ")) });
    if (user.last_blog_slug) timeline.push({ label: "Contributed to construction knowledge thread", meta: toTitleCase(user.last_blog_slug.replace(/-/g, " ")) });
    if (user.forum_quality_streak_days > 0) timeline.push({ label: "Maintained helpful contribution streak", meta: `${user.forum_quality_streak_days} day quality streak` });
    if (followers > 0) timeline.push({ label: "Gained trusted followers", meta: `${formatNumber(followers)} professionals following` });
    timeline.push({ label: "Active in TatvaOps ecosystem", meta: `Last seen ${new Date(user.last_seen_at).toLocaleDateString()}` });
    return timeline.slice(0, 5);
  }, [followers, siteJournalContributions, user.forum_quality_streak_days, user.last_blog_slug, user.last_forum_slug, user.last_seen_at]);

  const aiActionPrompts = useMemo(() => {
    const identity = profileData.profession || "construction professional";
    const focus = profileData.expertise || topInterestTags[0] || "construction discussions";
    return [
      `Summarize ${profileHeadlineName}'s expertise as a ${identity} across TatvaOps contributions.`,
      `Find experts similar to ${profileHeadlineName} for ${focus}.`,
      `Analyze the quality and trust signals in ${profileHeadlineName}'s recent contributions.`,
      `Show related procurement and cost discussions connected to ${profileHeadlineName}.`,
    ];
  }, [profileData.expertise, profileData.profession, profileHeadlineName, topInterestTags]);

  const trustSummary = useMemo(() => {
    const strongest = expertiseAreas[0]?.label ?? "Construction discussions";
    const trustLevel = user.reputation_score >= 500 ? "High" : user.reputation_score >= 100 ? "Growing" : "Emerging";
    return {
      strongest,
      trustLevel,
      trend: user.forum_quality_streak_days >= 7
        ? "Consistently helpful in the last 30 days"
        : "Building trust through ongoing participation",
    };
  }, [expertiseAreas, user.forum_quality_streak_days, user.reputation_score]);

  const handleSaveProfile = async () => {
    if (savingProfile) return;
    const previous = profileData;
    setProfileData((prev) => ({ ...prev, ...draft }));
    setSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);
    try {
      const response = await fetch("/api/users/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: draft.username,
          bio: draft.bio,
          location: draft.location,
          website: draft.website,
          email: draft.email,
          phone: draft.phone,
          profession: draft.profession,
          expertise: draft.expertise,
          yearsOfExperience: draft.yearsOfExperience,
          companyType: draft.companyType,
          verificationPreference: draft.verificationPreference,
          publicExpertiseEnabled: draft.publicExpertiseEnabled,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        profile?: typeof previous;
      };
      if (!response.ok) throw new Error(payload.error ?? "Failed to update profile.");
      const updated = payload.profile ?? previous;
      setProfileData(updated);
      setDraft(updated);
      setProfileSuccess("Profile updated.");
      setEditMode(false);
    } catch (error) {
      setProfileData(previous);
      setProfileError(error instanceof Error ? error.message : "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelEdit = () => {
    setDraft(profileData);
    setProfileError(null);
    setProfileSuccess(null);
    setEditMode(false);
  };

  useEffect(() => {
    if (!isOwnProfile) return;
    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch("/api/users/update-profile", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          profile?: {
            username?: string | null;
            bio?: string | null;
            location?: string | null;
            website?: string | null;
            email?: string | null;
            email_verified?: boolean;
            phone?: string | null;
            phone_verified?: boolean;
            profession?: string | null;
            expertise?: string | null;
            yearsOfExperience?: string | null;
            companyType?: string | null;
            verificationPreference?: string | null;
            publicExpertiseEnabled?: boolean;
            expertiseBadge?: string | null;
          };
        };
        const profile = payload.profile;
        if (!profile || cancelled) return;
        const next = {
          username: String(profile.username ?? user.username ?? ""),
          bio: String(profile.bio ?? user.bio ?? ""),
          location: String(profile.location ?? user.location ?? ""),
          website: String(profile.website ?? user.website ?? ""),
          email: String(profile.email ?? ""),
          email_verified: Boolean(profile.email_verified),
          phone: String(profile.phone ?? ""),
          phone_verified: Boolean(profile.phone_verified),
          profession: String(profile.profession ?? ""),
          expertise: String(profile.expertise ?? ""),
          yearsOfExperience: String(profile.yearsOfExperience ?? ""),
          companyType: String(profile.companyType ?? ""),
          verificationPreference: String(profile.verificationPreference ?? "none"),
          publicExpertiseEnabled: Boolean(profile.publicExpertiseEnabled),
          expertiseBadge: String(profile.expertiseBadge ?? ""),
        };
        setProfileData(next);
        setDraft(next);
      } catch {
        // keep public-safe defaults
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isOwnProfile, user.bio, user.location, user.username, user.website]);

  useEffect(() => {
    if (!isOwnProfile) return;
    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch("/api/expertise-config", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { professions?: string[]; expertiseAreas?: string[] };
        if (!cancelled) {
          setIdentityOptions({
            professions: Array.isArray(payload.professions) ? payload.professions : [],
            expertiseAreas: Array.isArray(payload.expertiseAreas) ? payload.expertiseAreas : [],
          });
        }
      } catch {
        // noop
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isOwnProfile]);

  const emailBadgeClass = useMemo(
    () => (profileData.email_verified
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-100 text-slate-600"),
    [profileData.email_verified],
  );
  const phoneBadgeClass = useMemo(
    () => (profileData.phone_verified
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-slate-200 bg-slate-100 text-slate-600"),
    [profileData.phone_verified],
  );
  const professionOptions = useMemo(() => {
    const list = [...identityOptions.professions];
    const legacy = String(draft.profession ?? "").trim();
    if (legacy && !list.includes(legacy)) list.unshift(`Current (legacy): ${legacy}`);
    return list;
  }, [identityOptions.professions, draft.profession]);
  const expertiseOptions = useMemo(() => {
    const list = [...identityOptions.expertiseAreas];
    const legacy = String(draft.expertise ?? "").trim();
    if (legacy && !list.includes(legacy)) list.unshift(`Current (legacy): ${legacy}`);
    return list;
  }, [identityOptions.expertiseAreas, draft.expertise]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-10">
        <section className="relative overflow-hidden rounded-2xl border border-app bg-surface p-6 shadow-sm transition-all duration-300 sm:p-8">
          <div className="pointer-events-none absolute -left-20 top-0 h-52 w-52 rounded-full bg-orange-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-sky-200/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-col items-center gap-5 sm:flex-row sm:items-start">
              {avatar.type === "initials" ? (
                <div
                  className={`flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br ${avatar.gradient} text-2xl font-semibold text-white shadow-lg ring-1 ring-white/30`}
                >
                  {avatar.name.slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <img
                  src={avatar.src}
                  alt={`${user.display_name} avatar`}
                  className={`h-28 w-28 rounded-2xl object-cover shadow-md ring-1 ring-black/5 ${
                    avatar.type === "dicebear" ? "opacity-90" : ""
                  }`}
                />
              )}
              <div className="min-w-0 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="truncate text-3xl font-semibold tracking-tight text-app sm:text-4xl">{profileHeadlineName}</h1>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur ${
                      typeClassMap[user.user_type]
                    }`}
                  >
                    {user.user_type.toLowerCase()}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold capitalize backdrop-blur ${
                      tierClassMap[user.reputation_tier] ?? tierClassMap.member
                    }`}
                  >
                    {user.reputation_tier}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-sm text-muted">
                  <p className="font-medium text-app">{profileData.profession || "Construction Professional"}</p>
                  <p className="text-app/80">{profileData.expertise || "Construction intelligence contributor"}</p>
                  <p>{profileData.yearsOfExperience || "Experience undisclosed"} • {inferredMarkets[0] || profileData.location || "India"}</p>
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{publicBio}</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted sm:justify-start">
                  <span className="rounded-full border border-app bg-subtle px-3 py-1">
                    Reputation: <span className="font-semibold text-app">{formatNumber(user.reputation_score)}</span>
                  </span>
                  <span className="rounded-full border border-app bg-subtle px-3 py-1">
                    Last seen: {new Date(user.last_seen_at).toLocaleDateString()}
                  </span>
                  {isOwnProfile ? (
                    <>
                      <ExpertiseBadge badge={profileData.expertiseBadge} />
                      <span className={`rounded-full px-3 py-1 ${emailBadgeClass}`}>
                        Email: {profileData.email_verified ? "Verified" : "Unverified"}
                      </span>
                      <span className={`rounded-full px-3 py-1 ${phoneBadgeClass}`}>
                        Phone: {profileData.phone_verified ? "Verified" : "Unverified"}
                      </span>
                    </>
                  ) : null}
                </div>
                <div className="mt-5 max-w-xl">
                  <div className="mb-1.5 flex items-center justify-between text-xs text-muted">
                    <span>Tier progress</span>
                    <span className="font-semibold">{Math.round(reputationProgress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300 transition-all"
                      style={{ width: `${reputationProgress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    {nextTier === user.reputation_tier
                      ? "Top tier reached"
                      : `${Math.max(0, progressCeil - user.reputation_score)} points to ${nextTier}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 rounded-2xl border border-app bg-subtle p-4 sm:w-auto sm:min-w-[260px]">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">Reputation intelligence</p>
              <p className="text-lg font-semibold text-app">{trustSummary.trustLevel} trust profile</p>
              <p className="text-sm text-muted">Strongest expertise: {trustSummary.strongest}</p>
              <p className="text-sm text-orange-600">↗ {trustSummary.trend}</p>
              <p className="text-xs text-muted">
                Helped through {formatNumber(user.forum_comments + user.blog_comments)} community interactions.
              </p>
              <div className="[&_button]:w-full [&_button]:rounded-lg [&_button]:border-blue-600 [&_button]:bg-blue-600 [&_button]:px-4 [&_button]:py-2 [&_button]:text-sm [&_button]:font-semibold [&_button]:text-white [&_button]:shadow-sm [&_button]:transition-all [&_button]:duration-200 [&_button]:hover:border-blue-700 [&_button]:hover:bg-blue-700 [&_button]:hover:text-white [&_button]:sm:w-auto">
                <FollowButton
                  targetIdentityKey={user.identity_key}
                  onFollowerCountChange={setFollowers}
                />
              </div>
              {isOwnProfile ? (
                !editMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(profileData);
                      setEditMode(true);
                      setProfileError(null);
                      setProfileSuccess(null);
                    }}
                    className="w-full rounded-lg border border-app bg-white px-4 py-2 text-sm font-semibold text-app transition-all duration-200 hover:bg-subtle sm:w-auto"
                  >
                    Edit profile
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={savingProfile}
                      onClick={() => {
                        void handleSaveProfile();
                      }}
                      className="w-full rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition-all duration-200 hover:bg-orange-100 disabled:opacity-60 sm:w-auto"
                    >
                      {savingProfile ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      type="button"
                      disabled={savingProfile}
                      onClick={handleCancelEdit}
                      className="w-full rounded-lg border border-app bg-white px-4 py-2 text-sm font-semibold text-app transition-all duration-200 hover:bg-subtle disabled:opacity-60 sm:w-auto"
                    >
                      Cancel
                    </button>
                  </>
                )
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-app bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-200">✨ Professional Intelligence Summary</p>
            <p className="mt-3 text-sm leading-7 text-muted">{aiSummary}</p>
          </div>
          <div className="rounded-2xl border border-app bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Reputation intelligence</p>
            <div className="mt-3 space-y-2 text-sm text-app/80">
              <p><span className="text-muted">Strongest expertise:</span> {trustSummary.strongest}</p>
              <p><span className="text-muted">Highly trusted in:</span> {knownFor.slice(0, 2).join(" • ") || "Community discussions"}</p>
              <p><span className="text-muted">Community trust:</span> {trustSummary.trustLevel}</p>
              <p className="text-orange-600">↗ {trustSummary.trend}</p>
            </div>
          </div>
        </section>

        {isOwnProfile && editMode ? (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Personal info</h2>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    value={draft.username}
                    onChange={(event) => setDraft((prev) => ({ ...prev, username: event.target.value }))}
                    maxLength={30}
                    placeholder="Username"
                    className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-app outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    value={draft.bio}
                    onChange={(event) => setDraft((prev) => ({ ...prev, bio: event.target.value }))}
                    maxLength={200}
                    placeholder="Bio"
                    rows={3}
                    className="min-h-[92px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-app outline-none focus:ring-2 focus:ring-blue-500 md:col-span-2"
                  />
                </div>
              </div>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Contact info</h2>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <input
                    value={draft.email}
                    onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
                    maxLength={320}
                    placeholder="Email"
                    className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-app outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={draft.phone}
                    onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
                    maxLength={20}
                    placeholder="Phone"
                    className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-app outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={draft.website}
                    onChange={(event) => setDraft((prev) => ({ ...prev, website: event.target.value }))}
                    maxLength={280}
                    placeholder="Website"
                    className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-app outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    value={draft.location}
                    onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))}
                    maxLength={120}
                    placeholder="Location"
                    className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-app outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Professional Identity</h2>
                <p className="mt-2 text-xs text-slate-500">
                  Configure your role and expertise to display credible professional identity across discussions.
                </p>
                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <select
                    value={draft.profession}
                    onChange={(event) => setDraft((prev) => ({ ...prev, profession: event.target.value }))}
                    className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-app outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select profession</option>
                    {professionOptions.map((item) => (
                      <option
                        key={item}
                        value={item.startsWith("Current (legacy): ") ? item.replace("Current (legacy): ", "") : item}
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draft.expertise}
                    onChange={(event) => setDraft((prev) => ({ ...prev, expertise: event.target.value }))}
                    className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-app outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select expertise</option>
                    {expertiseOptions.map((item) => (
                      <option
                        key={item}
                        value={item.startsWith("Current (legacy): ") ? item.replace("Current (legacy): ", "") : item}
                      >
                        {item}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draft.yearsOfExperience}
                    onChange={(event) => setDraft((prev) => ({ ...prev, yearsOfExperience: event.target.value }))}
                    className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-app outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Experience level</option>
                    {EXPERIENCE_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <select
                    value={draft.companyType}
                    onChange={(event) => setDraft((prev) => ({ ...prev, companyType: event.target.value }))}
                    className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-app outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Company type</option>
                    {COMPANY_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-app">
                    <span>Public Expertise</span>
                    <input
                      type="checkbox"
                      checked={draft.publicExpertiseEnabled}
                      onChange={(event) => setDraft((prev) => ({ ...prev, publicExpertiseEnabled: event.target.checked }))}
                    />
                  </label>
                </div>
              </div>
              <div className="sticky bottom-2 z-10 mt-2 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-orange-100 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={() => {
                    void handleSaveProfile();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition-all duration-200 hover:bg-orange-100 disabled:opacity-60"
                >
                  <span aria-hidden>💾</span>
                  {savingProfile ? "Saving..." : "Save changes"}
                </button>
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={handleCancelEdit}
                  className="rounded-lg border border-app bg-white px-4 py-2 text-sm font-semibold text-app transition-all duration-200 hover:bg-subtle disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {(profileError || profileSuccess) && isOwnProfile ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 text-sm shadow-sm">
            {profileError ? <span className="font-medium text-rose-600">{profileError}</span> : null}
            {profileSuccess ? <span className="font-medium text-emerald-700">{profileSuccess}</span> : null}
          </div>
        ) : null}

        <section className="rounded-2xl border border-app bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-app">Contribution Areas</h2>
            <span className="text-xs text-muted">Signal-weighted expertise distribution</span>
          </div>
          <div className="space-y-3">
            {expertiseAreas.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-app">{item.label}</span>
                  <span className="text-muted">{item.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-gradient-to-r from-orange-300/90 via-orange-400/80 to-amber-200/90 shadow-[0_0_10px_rgba(251,146,60,0.35)]" style={{ width: `${item.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-app bg-surface p-5">
          <h2 className="text-lg font-semibold text-app">Known For</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {knownFor.map((item) => (
              <span key={item} className="rounded-full border border-app bg-subtle px-3 py-1.5 text-xs text-app/80 transition hover:-translate-y-0.5 hover:bg-slate-100">
                {item}
              </span>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 rounded-2xl border border-app bg-surface p-4 md:grid-cols-4">
          <div className="rounded-xl border border-app bg-white p-4 transition-all duration-200 hover:-translate-y-0.5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Followers</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(followers)}</p>
          </div>
          <div className="rounded-xl border border-app bg-white p-4 transition-all duration-200 hover:-translate-y-0.5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Following</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(initialFollowing)}</p>
          </div>
          <div className="rounded-xl border border-app bg-white p-4 transition-all duration-200 hover:-translate-y-0.5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Forum comments</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(user.forum_comments)}</p>
          </div>
          <div className="rounded-xl border border-app bg-white p-4 transition-all duration-200 hover:-translate-y-0.5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Blog comments</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(user.blog_comments)}</p>
          </div>
          <div className="rounded-xl border border-app bg-white p-4 transition-all duration-200 hover:-translate-y-0.5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Blog views</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(user.blog_views)}</p>
          </div>
          <div className="rounded-xl border border-app bg-white p-4 transition-all duration-200 hover:-translate-y-0.5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Forum views</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(user.forum_views)}</p>
          </div>
          <div className="rounded-xl border border-app bg-white p-4 transition-all duration-200 hover:-translate-y-0.5">
            <p className="text-xs uppercase tracking-wide text-gray-500">Forum posts</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(user.forum_posts)}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-app bg-surface p-5">
          <h2 className="text-lg font-semibold text-app">Top Contributions</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {topContributions.map((item) => (
              <Link key={`${item.type}-${item.href}`} href={item.href} className="group rounded-xl border border-app bg-white p-4 transition hover:-translate-y-0.5 hover:bg-subtle">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                    {item.type}
                  </span>
                  <span className="text-[11px] text-muted">{item.metric}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-app">{item.title}</p>
                <p className="mt-1 text-xs text-muted">{item.context}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-app bg-surface p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-app">Site Journal Contributions</h2>
            <span className="text-xs text-muted">{siteJournalContributions.length} active sites</span>
          </div>
          {siteJournalContributions.length ? (
            <>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {siteJournalContributions.map((journal) => (
                  <Link
                    key={journal.id}
                    href={`/projects/${journal.slug}`}
                    className="rounded-xl border border-app bg-white p-4 transition hover:bg-subtle"
                  >
                    <p className="text-sm font-semibold text-app">{journal.title}</p>
                    <p className="mt-1 text-xs text-muted">{journal.city}, {journal.region} - Week {journal.timeline.week}</p>
                    <p className="mt-2 text-xs text-app/80 line-clamp-2">{journal.aiRiskPulse}</p>
                  </Link>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(siteJournalSpecialties.length ? siteJournalSpecialties : ["Execution planning"]).map((specialty) => (
                  <span key={specialty} className="rounded-full border border-app bg-subtle px-3 py-1 text-xs text-app/80">
                    {specialty}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">No linked site journal contributions yet.</p>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-app bg-surface p-5">
            <h2 className="text-lg font-semibold text-app">Recent Activity</h2>
            <div className="mt-4 space-y-4">
              {activityTimeline.map((item, index) => (
                <div key={`${item.label}-${index}`} className="relative pl-6">
                  <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-orange-300" />
                  {index !== activityTimeline.length - 1 ? <span className="absolute left-[3px] top-4 h-[calc(100%+8px)] w-px bg-slate-300" /> : null}
                  <p className="text-sm text-app">{item.label}</p>
                  <p className="text-xs text-muted">{item.meta}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-app bg-surface p-5">
              <h2 className="text-lg font-semibold text-app">Active Markets</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {(inferredMarkets.length ? inferredMarkets : ["Construction ecosystem"]).map((market) => (
                  <span key={market} className="rounded-full border border-app bg-subtle px-3 py-1 text-xs text-app/80">{market}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-app bg-surface p-5">
              <h2 className="text-lg font-semibold text-app">Social Proof</h2>
              <p className="mt-2 text-sm text-muted">
                Frequently referenced in {knownFor.slice(0, 2).join(" and ") || "construction discussions"} with sustained trust signals from the community.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-app bg-surface p-5">
          <h2 className="text-lg font-semibold text-app">Ask AI with profile context</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {aiActionPrompts.map((prompt) => (
              <Link
                key={prompt}
                href={`/ask?prompt=${encodeURIComponent(prompt)}${user.last_blog_slug ? `&anchor=${encodeURIComponent(user.last_blog_slug)}` : ""}`}
                className="rounded-xl border border-app bg-white px-3 py-2 text-sm text-app transition hover:bg-subtle"
              >
                {prompt}
              </Link>
            ))}
          </div>
        </section>

        {isOwnProfile && ((!profileData.email_verified && Boolean(profileData.email)) || (!profileData.phone_verified && Boolean(profileData.phone))) ? (
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="space-y-3">
              {!profileData.email_verified && profileData.email ? (
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-app">Email verification</span>
                    <button
                      type="button"
                      disabled={verifyState.email.sending}
                      onClick={async () => {
                        setVerifyState((prev) => ({
                          ...prev,
                          email: { ...prev.email, sending: true, error: null, success: null },
                        }));
                        try {
                          const response = await fetch("/api/users/send-verification", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ type: "email" }),
                          });
                          const payload = (await response.json().catch(() => ({}))) as { error?: string };
                          if (!response.ok) throw new Error(payload.error ?? "Failed to send code.");
                          setVerifyState((prev) => ({
                            ...prev,
                            email: {
                              ...prev.email,
                              sending: false,
                              sent: true,
                              success: "Code sent.",
                              error: null,
                            },
                          }));
                        } catch (error) {
                          setVerifyState((prev) => ({
                            ...prev,
                            email: {
                              ...prev.email,
                              sending: false,
                              error: error instanceof Error ? error.message : "Failed to send code.",
                            },
                          }));
                        }
                      }}
                      className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                    >
                      {verifyState.email.sending ? "Sending..." : "Verify"}
                    </button>
                  </div>
                  {verifyState.email.sent ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        value={verifyState.email.code}
                        onChange={(event) =>
                          setVerifyState((prev) => ({
                            ...prev,
                            email: { ...prev.email, code: event.target.value },
                          }))}
                        placeholder="Enter code"
                        maxLength={6}
                        className="h-9 w-32 rounded-lg border border-gray-200 bg-white px-2 text-xs text-app outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        disabled={verifyState.email.verifying}
                        onClick={async () => {
                          setVerifyState((prev) => ({
                            ...prev,
                            email: { ...prev.email, verifying: true, error: null, success: null },
                          }));
                          try {
                            const response = await fetch("/api/users/verify", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ type: "email", code: verifyState.email.code.trim() }),
                            });
                            const payload = (await response.json().catch(() => ({}))) as { error?: string };
                            if (!response.ok) throw new Error(payload.error ?? "Failed to verify code.");
                            setProfileData((prev) => ({ ...prev, email_verified: true }));
                            setVerifyState((prev) => ({
                              ...prev,
                              email: {
                                ...prev.email,
                                verifying: false,
                                sent: false,
                                code: "",
                                success: "Email verified.",
                                error: null,
                              },
                            }));
                          } catch (error) {
                            setVerifyState((prev) => ({
                              ...prev,
                              email: {
                                ...prev.email,
                                verifying: false,
                                error: error instanceof Error ? error.message : "Verification failed.",
                              },
                            }));
                          }
                        }}
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        {verifyState.email.verifying ? "Verifying..." : "Submit"}
                      </button>
                    </div>
                  ) : null}
                  {verifyState.email.error ? <p className="mt-1 text-[11px] text-rose-600">{verifyState.email.error}</p> : null}
                  {verifyState.email.success ? <p className="mt-1 text-[11px] text-emerald-700">{verifyState.email.success}</p> : null}
                </div>
              ) : null}

              {!profileData.phone_verified && profileData.phone ? (
                <div className="rounded-xl border border-gray-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-app">Phone verification</span>
                    <button
                      type="button"
                      disabled={verifyState.phone.sending}
                      onClick={async () => {
                        setVerifyState((prev) => ({
                          ...prev,
                          phone: { ...prev.phone, sending: true, error: null, success: null },
                        }));
                        try {
                          const response = await fetch("/api/users/send-verification", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ type: "phone" }),
                          });
                          const payload = (await response.json().catch(() => ({}))) as { error?: string };
                          if (!response.ok) throw new Error(payload.error ?? "Failed to send code.");
                          setVerifyState((prev) => ({
                            ...prev,
                            phone: {
                              ...prev.phone,
                              sending: false,
                              sent: true,
                              success: "Code sent.",
                              error: null,
                            },
                          }));
                        } catch (error) {
                          setVerifyState((prev) => ({
                            ...prev,
                            phone: {
                              ...prev.phone,
                              sending: false,
                              error: error instanceof Error ? error.message : "Failed to send code.",
                            },
                          }));
                        }
                      }}
                      className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                    >
                      {verifyState.phone.sending ? "Sending..." : "Verify"}
                    </button>
                  </div>
                  {verifyState.phone.sent ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        value={verifyState.phone.code}
                        onChange={(event) =>
                          setVerifyState((prev) => ({
                            ...prev,
                            phone: { ...prev.phone, code: event.target.value },
                          }))}
                        placeholder="Enter code"
                        maxLength={6}
                        className="h-9 w-32 rounded-lg border border-gray-200 bg-white px-2 text-xs text-app outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        disabled={verifyState.phone.verifying}
                        onClick={async () => {
                          setVerifyState((prev) => ({
                            ...prev,
                            phone: { ...prev.phone, verifying: true, error: null, success: null },
                          }));
                          try {
                            const response = await fetch("/api/users/verify", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ type: "phone", code: verifyState.phone.code.trim() }),
                            });
                            const payload = (await response.json().catch(() => ({}))) as { error?: string };
                            if (!response.ok) throw new Error(payload.error ?? "Failed to verify code.");
                            setProfileData((prev) => ({ ...prev, phone_verified: true }));
                            setVerifyState((prev) => ({
                              ...prev,
                              phone: {
                                ...prev.phone,
                                verifying: false,
                                sent: false,
                                code: "",
                                success: "Phone verified.",
                                error: null,
                              },
                            }));
                          } catch (error) {
                            setVerifyState((prev) => ({
                              ...prev,
                              phone: {
                                ...prev.phone,
                                verifying: false,
                                error: error instanceof Error ? error.message : "Verification failed.",
                              },
                            }));
                          }
                        }}
                        className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        {verifyState.phone.verifying ? "Verifying..." : "Submit"}
                      </button>
                    </div>
                  ) : null}
                  {verifyState.phone.error ? <p className="mt-1 text-[11px] text-rose-600">{verifyState.phone.error}</p> : null}
                  {verifyState.phone.success ? <p className="mt-1 text-[11px] text-emerald-700">{verifyState.phone.success}</p> : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="rounded-2xl border border-app bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 text-xs text-muted">
              <span className="rounded-full border border-app bg-subtle px-3 py-1">Writing tone: {user.writing_tone}</span>
              <span className="rounded-full border border-app bg-subtle px-3 py-1">Behavior: {user.behavior_type}</span>
              <span className="rounded-full border border-app bg-subtle px-3 py-1">
                Activity window: {user.active_start_hour}:00 - {user.active_end_hour}:00
              </span>
            </div>
            <span className="rounded-full border border-app bg-subtle px-3 py-1 text-[11px] text-muted">
              Identity: {user.identity_key}
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
