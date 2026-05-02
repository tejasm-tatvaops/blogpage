"use client";

// DO NOT MODIFY INTERNAL LOGIC OR JSX STRUCTURE
// ONLY STYLING CHANGES — all links, auth, notifications preserved

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const linkClass = (href: string, exact: boolean) =>
    [
      "rounded-full px-3 py-2 text-sm font-medium transition-all duration-200",
      isActive(href, exact)
        ? "bg-orange-500 !text-white shadow-[0_0_12px_rgba(234,88,12,0.35)]"
        : "text-muted hover:text-app hover:bg-black/6 dark:hover:bg-white/8",
    ].join(" ");

  return (
    <header className="sticky top-2 z-40 mx-2 mb-2 sm:mx-4 md:top-4">
      <div className="rounded-2xl glass-nav px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex items-center justify-between gap-2 sm:gap-3">

        {/* Logo */}
        <Link href="/" className="flex min-w-0 shrink-0 items-center" aria-label="TatvaOps home" onClick={() => setMobileNavOpen(false)}>
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

        {/* Navigation links — tablet/desktop */}
        <nav className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-0.5 md:flex" aria-label="Main">
          {NAV_LINKS.map(({ href, label, exact }) => (
            <Link key={href} href={href} className={linkClass(href, exact)}>
              {label}
            </Link>
          ))}

          <Link
            href="/saved"
            aria-label="Saved articles"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:text-app hover:bg-black/6 dark:hover:bg-white/8"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </Link>
        </nav>

        {/* Right: credits + notifications + auth + mobile menu */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <UserStatsBadge />
          <NotificationBell />
          <NavbarAuthButton
            pillClass="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-muted transition hover:text-app hover:bg-black/6 dark:hover:bg-white/8 sm:px-3"
          />
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-black/6 hover:text-app dark:hover:bg-white/8 md:hidden"
            aria-expanded={mobileNavOpen}
            aria-controls="nav-mobile-panel"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            {mobileNavOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>

        </div>

        {/* Mobile navigation panel */}
        {mobileNavOpen ? (
          <nav
            id="nav-mobile-panel"
            className="mt-3 max-h-[min(70vh,520px)] overflow-y-auto border-t border-black/10 pt-3 dark:border-white/10 md:hidden"
            aria-label="Mobile"
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map(({ href, label, exact }) => (
                <Link key={href} href={href} className={linkClass(href, exact)} onClick={() => setMobileNavOpen(false)}>
                  {label}
                </Link>
              ))}
              <Link
                href="/saved"
                className="flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:bg-black/6 hover:text-app dark:hover:bg-white/8"
                onClick={() => setMobileNavOpen(false)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                Saved
              </Link>
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
