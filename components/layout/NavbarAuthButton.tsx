"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useAuthModal } from "@/components/providers/AuthProvider";
import { StoryUploadModal } from "@/components/stories/StoryUploadModal";
import { StoryViewer } from "@/components/stories/StoryViewer";
import type { Story } from "@/lib/storyService";

type Props = { pillClass: string };

const REFRESH_MS = 60_000;

function UserAvatar({ image, name }: { image?: string | null; name?: string | null }) {
  const [failed, setFailed] = useState(false);
  const initial = (name ?? "U")[0]?.toUpperCase() ?? "U";

  if (!image || failed) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[0.54rem] font-bold leading-none text-white">
        {initial}
      </span>
    );
  }

  return (
    <img
      src={image}
      alt={name ?? "User"}
      width={28}
      height={28}
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      className="h-7 w-7 shrink-0 rounded-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export function NavbarAuthButton({ pillClass }: Props) {
  const { data: session, status } = useSession();
  const { openLoginModal } = useAuthModal();
  const [storyOpen, setStoryOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [myStories, setMyStories] = useState<Story[]>([]);

  const hasActiveStory = myStories.length > 0;

  const fetchMyStories = async () => {
    try {
      const res = await fetch("/api/stories");
      if (!res.ok) return;
      const json = (await res.json()) as { viewer_stories?: Story[] };
      const now = Date.now();
      setMyStories(
        (json.viewer_stories ?? []).filter(
          (s) => new Date(s.expires_at).getTime() > now,
        ),
      );
    } catch {
      // non-critical
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    void fetchMyStories();
    const id = setInterval(() => void fetchMyStories(), REFRESH_MS);
    return () => clearInterval(id);
  }, [status]);

  if (status === "loading") {
    return (
      <span
        className={`${pillClass} h-8 w-8 shrink-0 rounded-full border border-app bg-subtle`}
        aria-hidden
      />
    );
  }

  const user = session?.user;

  if (user) {
    const myIdentityKey = user.id ? `google:${user.id}` : "";
    const displayName = user.name?.split(" ")[0] ?? "You";

    return (
      <>
        <div className="relative group">
          <button
            type="button"
            className={`${pillClass} gap-1.5 !px-1`}
            aria-label="Account menu"
            onClick={() => { if (hasActiveStory) setViewerOpen(true); }}
          >
            {/* Avatar with gradient ring when story is active */}
            <span
              className={[
                "flex shrink-0 rounded-full p-[2px] transition-all duration-300",
                hasActiveStory
                  ? "bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300"
                  : "bg-transparent",
              ].join(" ")}
            >
              <span className={hasActiveStory ? "block rounded-full bg-app p-[1.5px]" : "block"}>
                <UserAvatar image={user.image} name={user.name} />
              </span>
            </span>
            <span className="max-w-[80px] truncate text-[0.72rem] font-medium leading-none">
              {displayName}
            </span>
          </button>

          {/* Dropdown */}
          <div className="pointer-events-none absolute right-0 top-full z-30 mt-1 min-w-[170px] rounded-xl border border-app bg-app opacity-0 shadow-lg transition-all group-hover:pointer-events-auto group-hover:opacity-100">
            {/* User info header */}
            <div className="border-b border-app px-4 py-2.5">
              <p className="truncate text-[0.9rem] font-semibold leading-tight text-app">{user.name}</p>
              <p className="truncate text-[0.78rem] font-normal leading-[1.5] text-muted">{user.email}</p>
            </div>

            {/* My profile */}
            {myIdentityKey ? (
              <Link
                href={`/user/${encodeURIComponent(myIdentityKey)}`}
                className="block w-full px-4 py-2.5 text-left text-[0.72rem] font-normal leading-none text-muted transition hover:bg-subtle hover:text-app"
              >
                My profile
              </Link>
            ) : null}

            {/* Post New Story — below My profile */}
            <button
              type="button"
              onClick={() => setStoryOpen(true)}
              className="flex w-full items-center gap-2 border-t border-app px-4 py-2.5 text-left text-[0.72rem] font-semibold leading-none text-primary transition hover:bg-subtle"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              Post New Story
            </button>

            {/* View own story if active */}
            {hasActiveStory && (
              <button
                type="button"
                onClick={() => setViewerOpen(true)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[0.72rem] font-normal leading-none text-muted transition hover:bg-subtle hover:text-app"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-orange-400 to-yellow-300" />
                View my story
              </button>
            )}

            <button
              type="button"
              onClick={() => signOut()}
              className="block w-full rounded-b-xl border-t border-app px-4 py-2.5 text-left text-[0.72rem] font-normal leading-none text-muted transition hover:bg-subtle hover:text-app"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Story composer (replaces existing story) */}
        <StoryUploadModal
          open={storyOpen}
          displayName={displayName}
          onClose={() => setStoryOpen(false)}
          onPosted={() => {
            setStoryOpen(false);
            void fetchMyStories();
          }}
        />

        {/* Own story viewer */}
        {viewerOpen && myStories.length > 0 && (
          <StoryViewer
            stories={myStories}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={openLoginModal}
      className={`${pillClass} gap-1.5`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
      Sign in
    </button>
  );
}
