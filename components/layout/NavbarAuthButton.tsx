"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useAuthModal } from "@/components/providers/AuthProvider";
import { useMe } from "@/hooks/useMe";

type Props = { pillClass: string };

export function NavbarAuthButton({ pillClass }: Props) {
  const { data, isLoading } = useMe();
  const { openLoginModal } = useAuthModal();
  const session = data?.session;

  if (isLoading) {
    return (
      <span className={`${pillClass} w-20 animate-pulse !bg-slate-200 dark:!bg-slate-700`} />
    );
  }

  if (session?.user) {
    const myIdentityKey = session.user.id ? `google:${session.user.id}` : "";
    return (
      <div className="relative group">
        <button
          type="button"
          className={`${pillClass} gap-2 !px-2`}
          aria-label="Account menu"
        >
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? "User"}
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white">
              {(session.user.name ?? "U")[0].toUpperCase()}
            </span>
          )}
          <span className="max-w-[90px] truncate text-xs">
            {session.user.name?.split(" ")[0]}
          </span>
        </button>

        {/* Dropdown */}
        <div className="pointer-events-none absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded-xl border border-app bg-app opacity-0 shadow-lg transition-all group-hover:pointer-events-auto group-hover:opacity-100">
          <div className="border-b border-app px-4 py-2.5">
            <p className="truncate text-xs font-semibold text-app">{session.user.name}</p>
            <p className="truncate text-xs text-muted">{session.user.email}</p>
          </div>
          {myIdentityKey ? (
            <Link
              href={`/user/${encodeURIComponent(myIdentityKey)}`}
              className="block w-full px-4 py-2.5 text-left text-sm text-muted transition hover:bg-subtle hover:text-app"
            >
              My profile
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => signOut()}
            className="block w-full rounded-b-xl px-4 py-2.5 text-left text-sm text-muted transition hover:bg-subtle hover:text-app"
          >
            Sign out
          </button>
        </div>
      </div>
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
