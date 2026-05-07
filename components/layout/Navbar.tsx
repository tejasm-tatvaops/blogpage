"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { NavbarAuthButton } from "@/components/layout/NavbarAuthButton";
import UserStatsBadge from "@/components/navbar/UserStatsBadge";
import { cn } from "@/lib/cn";

const NAV_LINKS = [
  { href: "/", label: "Home", exact: true },
  { href: "/blog", label: "Blogs", exact: false },
  { href: "/forums", label: "Forums", exact: false },
  { href: "/shorts", label: "Shorts", exact: false },
  { href: "/inshorts", label: "Tatva Inshorts", exact: false },
  { href: "/tutorials", label: "Tutorials", exact: false },
  { href: "/projects", label: "Site Journals", exact: false },
  { href: "/supplier", label: "Suppliers", exact: false },
  { href: "/brand-profile", label: "Brands", exact: false },
  { href: "/ask", label: "Ask AI", exact: false },
  { href: "/admin/login", label: "Admin", exact: false },
];

/** Desktop chrome: fixed 50px-tall bar, 1100px cap, shifted for the 88px left rail. */
export function Navbar() {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const linkClass = (href: string, exact: boolean) =>
    [
      "rounded-lg px-[6px] py-[6px] text-[0.68rem] font-medium leading-none transition-all duration-200 whitespace-nowrap",
      isActive(href, exact)
        ? "bg-orange-500 !text-white shadow-[0_0_12px_rgba(234,88,12,0.3)]"
        : "text-muted hover:text-app hover:bg-black/[0.045] dark:hover:bg-white/5",
    ].join(" ");

  return (
    <>
      <header
        id="hdr"
        className={cn(
          "z-40 border-[1px] border-[rgba(249,115,22,0.22)] bg-[rgba(244,245,251,0.97)] backdrop-saturate-150 dark:bg-[rgba(10,13,34,0.82)]",
          "transition-[background-color,border-color,box-shadow] duration-200",
          "shadow-[0_8px_32px_rgba(0,0,0,0.08),0_0_0_1px_rgba(249,115,22,0.06)]",
          "dark:shadow-[0_8px_40px_rgba(4,6,18,0.55),0_0_0_1px_rgba(249,115,22,0.06),inset_0_1px_0_rgba(255,255,255,0.04)]",
          "backdrop-blur-[10px] md:backdrop-blur-[20px]",
          "sticky top-2 mx-2 mb-2 min-w-0 rounded-[14px]",
          "md:fixed md:top-[14px] md:mx-0 md:mb-0 md:h-[50px] md:min-w-[640px] md:w-[1100px] md:max-w-[calc(100%-160px)] md:rounded-[14px] md:px-[14px]",
          isAdmin
            ? "md:left-1/2 md:-translate-x-1/2"
            : "md:left-[calc(50%+64px)] md:-translate-x-1/2",
        )}
      >
        <div className="flex h-[50px] w-full items-center gap-[10px] px-[14px] leading-none md:grid md:grid-cols-[auto_1fr_auto] md:px-0">
          <Link href="/" className="shrink-0 md:hidden" aria-label="TatvaOps home">
            <Image
              src="/tatvaops-logo-transparent.png"
              alt="TatvaOps"
              width={430}
              height={108}
              className="h-6 w-auto object-contain"
              priority
            />
          </Link>
          <Link href="/" className="hidden shrink-0 md:block" aria-label="TatvaOps home">
            <Image
              src="/tatvaops-logo-transparent.png"
              alt="TatvaOps"
              width={430}
              height={108}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>
          <div className="hidden min-w-0 items-center justify-center md:flex">
            <nav
              className="flex min-w-0 flex-nowrap items-center justify-center gap-0.5 px-1 py-1"
              aria-label="Main"
            >
              {NAV_LINKS.map(({ href, label, exact }) => (
                <Link key={href} href={href} className={linkClass(href, exact)}>
                  {label}
                </Link>
              ))}

              <Link
                href="/saved"
                aria-label="Saved articles"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-black/[0.045] hover:text-app dark:hover:bg-white/5"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </Link>
            </nav>
          </div>

          <div className="hdr-right ml-auto flex h-full shrink-0 items-center gap-1">
            <UserStatsBadge />
            <NotificationBell />
            <NavbarAuthButton
              pillClass={cn(
                "flex h-8 max-h-8 min-h-8 items-center gap-1.5 rounded-lg px-[8px] text-[0.72rem] font-medium leading-none text-muted transition hover:bg-black/[0.05] hover:text-app dark:hover:bg-white/4",
              )}
            />
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-black/[0.05] hover:text-app dark:hover:bg-white/4 md:hidden"
              aria-expanded={mobileNavOpen}
              aria-controls="nav-mobile-panel"
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              {mobileNavOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {mobileNavOpen ? (
          <nav
            id="nav-mobile-panel"
            className="max-h-[min(70vh,520px)] overflow-y-auto border-t border-black/10 px-[14px] pb-3 pt-3 dark:border-white/10 md:hidden"
            aria-label="Mobile"
          >
            <div className="flex flex-col gap-px">
              {NAV_LINKS.map(({ href, label, exact }) => (
                <Link key={href} href={href} className={linkClass(href, exact)} onClick={() => setMobileNavOpen(false)}>
                  {label}
                </Link>
              ))}
              <Link
                href="/saved"
                className="flex items-center gap-2 rounded-lg px-[8px] py-[5px] text-[0.72rem] font-medium leading-none text-muted transition hover:bg-black/[0.05] hover:text-app dark:hover:bg-white/4"
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
      </header>
      <div className="hidden shrink-0 md:block md:h-[calc(14px+50px+14px)]" aria-hidden />
    </>
  );
}
