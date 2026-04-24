"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getUserAvatar } from "@/lib/identityUI";
import type { UserProfile } from "@/lib/userProfileService";
import { FollowButton } from "@/components/user/FollowButton";

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

export function PublicUserProfile({
  user,
  initialFollowers,
  initialFollowing,
}: PublicUserProfileProps) {
  const [followers, setFollowers] = useState(initialFollowers);
  const [profileData, setProfileData] = useState({
    username: user.username ?? "",
    bio: user.bio ?? "",
    location: user.location ?? "",
    website: user.website ?? "",
    email: "",
    email_verified: false,
    phone: "",
    phone_verified: false,
  });
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(profileData);
  const [savingProfile, setSavingProfile] = useState(false);
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
  const currentTierIndex = Math.max(0, tierOrder.indexOf((user.reputation_tier || "member") as (typeof tierOrder)[number]));
  const nextTier = tierOrder[Math.min(currentTierIndex + 1, tierOrder.length - 1)];
  const progressBase = tierThresholds[tierOrder[currentTierIndex]];
  const progressCeil = tierThresholds[nextTier];
  const reputationProgress = progressCeil > progressBase
    ? Math.min(100, Math.max(0, ((user.reputation_score - progressBase) / (progressCeil - progressBase)) * 100))
    : 100;

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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-[28px] border border-app bg-surface shadow-[0_30px_80px_-36px_rgba(2,6,23,0.6)]">
        <div className="relative border-b border-app bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 px-6 pb-6 pt-8 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-500/10" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-indigo-200/20 blur-3xl dark:bg-indigo-500/10" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              {avatar.type === "initials" ? (
                <div
                  className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${avatar.gradient} flex items-center justify-center text-xl font-semibold text-white shadow-lg ring-1 ring-white/30`}
                >
                  {avatar.name.slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <img
                  src={avatar.src}
                  alt={`${user.display_name} avatar`}
                  className={`h-20 w-20 rounded-2xl object-cover shadow-lg ring-1 ring-white/30 ${
                    avatar.type === "dicebear" ? "opacity-90" : ""
                  }`}
                />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-bold text-app sm:text-3xl">{user.display_name}</h1>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      typeClassMap[user.user_type]
                    }`}
                  >
                    {user.user_type.toLowerCase()}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize ${
                      tierClassMap[user.reputation_tier] ?? tierClassMap.member
                    }`}
                  >
                    {user.reputation_tier}
                  </span>
                </div>
                {profileData.username ? (
                  <p className="mt-1 text-sm font-medium text-sky-700">@{profileData.username}</p>
                ) : null}
                {isOwnProfile && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {!editMode ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(profileData);
                          setEditMode(true);
                          setProfileError(null);
                          setProfileSuccess(null);
                        }}
                        className="rounded-md border border-app bg-surface px-2.5 py-1 text-xs font-semibold text-app hover:bg-subtle"
                      >
                        Edit profile
                      </button>
                    ) : (
                      <>
                        <input
                          value={draft.username}
                          onChange={(event) => setDraft((prev) => ({ ...prev, username: event.target.value }))}
                          maxLength={30}
                          placeholder="username"
                          className="h-8 rounded-md border border-app bg-surface px-2.5 text-xs text-app outline-none ring-sky-400 focus:ring-2"
                        />
                        <textarea
                          value={draft.bio}
                          onChange={(event) => setDraft((prev) => ({ ...prev, bio: event.target.value }))}
                          maxLength={200}
                          placeholder="Bio"
                          rows={2}
                          className="min-h-[56px] w-full rounded-md border border-app bg-surface px-2.5 py-1.5 text-xs text-app outline-none ring-sky-400 focus:ring-2"
                        />
                        <input
                          value={draft.location}
                          onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))}
                          maxLength={120}
                          placeholder="Location"
                          className="h-8 rounded-md border border-app bg-surface px-2.5 text-xs text-app outline-none ring-sky-400 focus:ring-2"
                        />
                        <input
                          value={draft.website}
                          onChange={(event) => setDraft((prev) => ({ ...prev, website: event.target.value }))}
                          maxLength={280}
                          placeholder="Website"
                          className="h-8 rounded-md border border-app bg-surface px-2.5 text-xs text-app outline-none ring-sky-400 focus:ring-2"
                        />
                        <input
                          value={draft.email}
                          onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
                          maxLength={320}
                          placeholder="Email"
                          className="h-8 rounded-md border border-app bg-surface px-2.5 text-xs text-app outline-none ring-sky-400 focus:ring-2"
                        />
                        <input
                          value={draft.phone}
                          onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
                          maxLength={20}
                          placeholder="Phone"
                          className="h-8 rounded-md border border-app bg-surface px-2.5 text-xs text-app outline-none ring-sky-400 focus:ring-2"
                        />
                        <button
                          type="button"
                          disabled={savingProfile}
                          onClick={async () => {
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
                          }}
                          className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:opacity-60"
                        >
                          {savingProfile ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          disabled={savingProfile}
                          onClick={() => {
                            setDraft(profileData);
                            setProfileError(null);
                            setProfileSuccess(null);
                            setEditMode(false);
                          }}
                          className="rounded-md border border-app bg-surface px-2.5 py-1 text-xs font-semibold text-app hover:bg-subtle disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {profileError ? (
                      <span className="text-xs font-medium text-rose-600">{profileError}</span>
                    ) : null}
                    {profileSuccess ? (
                      <span className="text-xs font-medium text-emerald-700">{profileSuccess}</span>
                    ) : null}
                  </div>
                )}
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  {publicBio}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span className="rounded-full border border-app bg-surface px-2.5 py-1">
                    Reputation: <span className="font-semibold text-app">{formatNumber(user.reputation_score)}</span>
                  </span>
                  <span className="rounded-full border border-app bg-surface px-2.5 py-1">
                    Last seen: {new Date(user.last_seen_at).toLocaleDateString()}
                  </span>
                  {isOwnProfile ? (
                    <>
                      <span className={`rounded-full border px-2.5 py-1 ${emailBadgeClass}`}>
                        Email: {profileData.email_verified ? "Verified" : "Unverified"}
                      </span>
                      <span className={`rounded-full border px-2.5 py-1 ${phoneBadgeClass}`}>
                        Phone: {profileData.phone_verified ? "Verified" : "Unverified"}
                      </span>
                    </>
                  ) : null}
                </div>
                {isOwnProfile ? (
                  <div className="mt-3 space-y-2">
                    {!profileData.email_verified && profileData.email ? (
                      <div className="rounded-lg border border-app bg-surface p-2">
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
                              className="h-8 w-28 rounded-md border border-app bg-surface px-2 text-xs text-app outline-none ring-sky-400 focus:ring-2"
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
                      <div className="rounded-lg border border-app bg-surface p-2">
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
                              className="h-8 w-28 rounded-md border border-app bg-surface px-2 text-xs text-app outline-none ring-sky-400 focus:ring-2"
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
                ) : null}
                <div className="mt-4 max-w-xl">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
                    <span>Tier progress</span>
                    <span>{Math.round(reputationProgress)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 transition-all"
                      style={{ width: `${reputationProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {nextTier === user.reputation_tier
                      ? "Top tier reached"
                      : `${Math.max(0, progressCeil - user.reputation_score)} points to ${nextTier}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-1 flex items-center gap-2">
              <FollowButton
                targetIdentityKey={user.identity_key}
                onFollowerCountChange={setFollowers}
              />
              <Link
                href="/"
                className="rounded-lg border border-app bg-surface px-3 py-1.5 text-sm font-semibold text-app transition hover:bg-subtle"
              >
                Home
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-app bg-gradient-to-b from-sky-50 to-surface p-4 dark:from-slate-900 dark:to-surface">
              <p className="text-xs uppercase tracking-wide text-muted">Followers</p>
              <p className="mt-1 text-2xl font-bold text-app">{formatNumber(followers)}</p>
            </div>
            <div className="rounded-2xl border border-app bg-gradient-to-b from-indigo-50 to-surface p-4 dark:from-slate-900 dark:to-surface">
              <p className="text-xs uppercase tracking-wide text-muted">Following</p>
              <p className="mt-1 text-2xl font-bold text-app">{formatNumber(initialFollowing)}</p>
            </div>
            <div className="rounded-2xl border border-app bg-gradient-to-b from-emerald-50 to-surface p-4 dark:from-slate-900 dark:to-surface">
              <p className="text-xs uppercase tracking-wide text-muted">Forum comments</p>
              <p className="mt-1 text-2xl font-bold text-app">{formatNumber(user.forum_comments)}</p>
            </div>
            <div className="rounded-2xl border border-app bg-gradient-to-b from-violet-50 to-surface p-4 dark:from-slate-900 dark:to-surface">
              <p className="text-xs uppercase tracking-wide text-muted">Blog comments</p>
              <p className="mt-1 text-2xl font-bold text-app">{formatNumber(user.blog_comments)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="rounded-2xl border border-app bg-surface p-4 xl:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted">Blog views</p>
              <p className="mt-1 text-lg font-semibold text-app">{formatNumber(user.blog_views)}</p>
            </div>
            <div className="rounded-2xl border border-app bg-surface p-4 xl:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted">Forum views</p>
              <p className="mt-1 text-lg font-semibold text-app">{formatNumber(user.forum_views)}</p>
            </div>
            <div className="rounded-2xl border border-app bg-surface p-4 xl:col-span-2">
              <p className="text-xs uppercase tracking-wide text-muted">Forum posts</p>
              <p className="mt-1 text-lg font-semibold text-app">{formatNumber(user.forum_posts)}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span className="rounded-full border border-app px-2 py-1">Writing tone: {user.writing_tone}</span>
            <span className="rounded-full border border-app px-2 py-1">Behavior: {user.behavior_type}</span>
            <span className="rounded-full border border-app px-2 py-1">Activity window: {user.active_start_hour}:00 - {user.active_end_hour}:00</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app pt-3">
            <Link href="/" className="text-sm font-medium text-sky-700 hover:underline">
              Back to home
            </Link>
            <span className="rounded-md border border-app px-2 py-1 text-[11px] text-muted">
              Identity: {user.identity_key}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
