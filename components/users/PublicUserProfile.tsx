"use client";

import { useEffect, useMemo, useState } from "react";
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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-10">
        <section className="relative overflow-hidden rounded-2xl border border-transparent bg-gradient-to-br from-sky-50 via-white to-purple-50 p-6 shadow-lg transition-all duration-200 sm:p-8">
          <div className="pointer-events-none absolute -right-24 -top-16 h-56 w-56 rounded-full bg-sky-100/50 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-col items-center gap-5 sm:flex-row sm:items-start">
              {avatar.type === "initials" ? (
                <div
                  className={`flex h-28 w-28 items-center justify-center rounded-xl bg-gradient-to-br ${avatar.gradient} text-2xl font-semibold text-white shadow-lg ring-1 ring-white/40`}
                >
                  {avatar.name.slice(0, 2).toUpperCase()}
                </div>
              ) : (
                <img
                  src={avatar.src}
                  alt={`${user.display_name} avatar`}
                  className={`h-28 w-28 rounded-xl object-cover shadow-lg ring-1 ring-white/40 ${
                    avatar.type === "dicebear" ? "opacity-90" : ""
                  }`}
                />
              )}
              <div className="min-w-0 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="truncate text-4xl font-bold tracking-tight text-app">{user.display_name}</h1>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      typeClassMap[user.user_type]
                    }`}
                  >
                    {user.user_type.toLowerCase()}
                  </span>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold capitalize ${
                      tierClassMap[user.reputation_tier] ?? tierClassMap.member
                    }`}
                  >
                    {user.reputation_tier}
                  </span>
                </div>
                {profileData.username ? (
                  <p className="mt-1 text-sm font-medium text-sky-700">@{profileData.username}</p>
                ) : null}
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{publicBio}</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 sm:justify-start">
                  <span className="rounded-full bg-gray-100 px-3 py-1">
                    Reputation: <span className="font-semibold text-app">{formatNumber(user.reputation_score)}</span>
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1">
                    Last seen: {new Date(user.last_seen_at).toLocaleDateString()}
                  </span>
                  {isOwnProfile ? (
                    <>
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
                  <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
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
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[220px]">
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
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-app transition-all duration-200 hover:shadow-sm sm:w-auto"
                  >
                    Edit profile
                  </button>
                ) : (
                  <>
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
                      className="w-full rounded-lg border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition-all duration-200 hover:bg-sky-100 disabled:opacity-60 sm:w-auto"
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
                      className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-app transition-all duration-200 hover:shadow-sm disabled:opacity-60 sm:w-auto"
                    >
                      Cancel
                    </button>
                  </>
                )
              ) : null}
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
            </div>
          </section>
        ) : null}

        {(profileError || profileSuccess) && isOwnProfile ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white p-4 text-sm shadow-sm">
            {profileError ? <span className="font-medium text-rose-600">{profileError}</span> : null}
            {profileSuccess ? <span className="font-medium text-emerald-700">{profileSuccess}</span> : null}
          </div>
        ) : null}

        <section className="grid grid-cols-2 gap-4 rounded-2xl border border-gray-100 bg-white/70 p-4 md:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            <p className="text-xs uppercase tracking-wide text-gray-500">Followers</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(followers)}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            <p className="text-xs uppercase tracking-wide text-gray-500">Following</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(initialFollowing)}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            <p className="text-xs uppercase tracking-wide text-gray-500">Forum comments</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(user.forum_comments)}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            <p className="text-xs uppercase tracking-wide text-gray-500">Blog comments</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(user.blog_comments)}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            <p className="text-xs uppercase tracking-wide text-gray-500">Blog views</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(user.blog_views)}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            <p className="text-xs uppercase tracking-wide text-gray-500">Forum views</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(user.forum_views)}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md">
            <p className="text-xs uppercase tracking-wide text-gray-500">Forum posts</p>
            <p className="mt-1 text-2xl font-bold text-app">{formatNumber(user.forum_posts)}</p>
          </div>
        </section>

        {isOwnProfile ? (
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

        <section className="rounded-2xl border border-gray-100 bg-gray-50 p-6">
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span className="rounded-full bg-gray-100 px-3 py-1">Writing tone: {user.writing_tone}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1">Behavior: {user.behavior_type}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1">
              Activity window: {user.active_start_hour}:00 - {user.active_end_hour}:00
            </span>
          </div>
          <div className="mt-8 flex justify-end">
            <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] text-muted">
              Identity: {user.identity_key}
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
