"use client";

// DO NOT MODIFY INTERNAL LOGIC OR JSX STRUCTURE
// ONLY STYLING CHANGES — all links, auth, notifications preserved

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { NavbarAuthButton } from "@/components/layout/NavbarAuthButton";
import UserStatsBadge from "@/components/navbar/UserStatsBadge";

const NAV_LINKS = [
  { href: "/",            label: "Home",          exact: true },
  { href: "/blog",        label: "Blogs",         exact: false },
  { href: "/forums",      label: "Forums",        exact: false },
  { href: "/shorts",      label: "Shorts",        exact: false },
  { href: "/inshorts",    label: "Tatva Inshorts", exact: false },
  { href: "/tutorials",   label: "Tutorials",     exact: false },
  { href: "/supplier",    label: "Suppliers",     exact: false },
  { href: "/brand-profile", label: "Brands",      exact: false },
  { href: "/ask",         label: "Ask AI",        exact: false },
  { href: "/admin/login", label: "Admin",         exact: false },
];

export function Navbar() {
  const pathname = usePathname();

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-4 z-40 mx-4 mb-2">
      <div className="flex items-center justify-between gap-3 rounded-2xl glass-nav px-4 py-2.5">

        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="TatvaOps home">
          <Image
            src="/tatvaops-logo.png"
            alt="TatvaOps"
            width={430}
            height={108}
            className="h-9 w-auto rounded-md object-contain dark:hidden"
            priority
          />
          <Image
            src="/tatvaops-logo-transparent.png"
            alt="TatvaOps"
            width={430}
            height={108}
            className="hidden h-9 w-auto rounded-md object-contain dark:block"
            priority
          />
        </Link>

        {/* Navigation links */}
        <nav className="flex flex-wrap items-center gap-0.5">
          {NAV_LINKS.map(({ href, label, exact }) => (
            <Link
              key={href}
              href={href}
              className={[
                "rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200",
                isActive(href, exact)
                  ? "bg-orange-500 !text-white shadow-[0_0_12px_rgba(234,88,12,0.35)]"
                  : "text-muted hover:text-app hover:bg-black/6 dark:hover:bg-white/8",
              ].join(" ")}
            >
              {label}
            </Link>
          ))}

          {/* Saved — icon-only bookmark link */}
          <Link
            href="/saved"
            aria-label="Saved articles"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:text-app hover:bg-black/6 dark:hover:bg-white/8"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </Link>
        </nav>

        {/* Right: credits + notifications + auth */}
        <div className="flex shrink-0 items-center gap-1.5">
          <UserStatsBadge />
          <NotificationBell />
          <NavbarAuthButton
            pillClass="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition hover:text-app hover:bg-black/6 dark:hover:bg-white/8"
          />
        </div>

      </div>
    </header>
  );
}
