"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useAuthModal } from "@/components/providers/AuthProvider";

type Props = { pillClass: string };

function UserAvatar({
  image,
  name,
}: {
  image?: string | null;
  name?: string | null;
}) {
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

    return (
      <div className="relative group">
        <button
          type="button"
          className={`${pillClass} gap-1.5 !px-2`}
          aria-label="Account menu"
        >
          <UserAvatar image={user.image} name={user.name} />
          <span className="max-w-[90px] truncate text-[0.72rem] font-medium leading-none">
            {user.name?.split(" ")[0]}
          </span>
        </button>

        <div className="pointer-events-none absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded-xl border border-app bg-app opacity-0 shadow-lg transition-all group-hover:pointer-events-auto group-hover:opacity-100">
          <div className="border-b border-app px-4 py-2.5">
            <p className="truncate text-[0.9rem] font-semibold leading-tight text-app">{user.name}</p>
            <p className="truncate text-[0.78rem] font-normal leading-[1.5] text-muted">{user.email}</p>
          </div>
          {myIdentityKey ? (
            <Link
              href={`/user/${encodeURIComponent(myIdentityKey)}`}
              className="block w-full px-4 py-2.5 text-left text-[0.72rem] font-normal leading-none text-muted transition hover:bg-subtle hover:text-app"
            >
              My profile
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => signOut()}
            className="block w-full rounded-b-xl px-4 py-2.5 text-left text-[0.72rem] font-normal leading-none text-muted transition hover:bg-subtle hover:text-app"
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
