import Image from "next/image";
import Link from "next/link";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { NavbarAuthButton } from "@/components/layout/NavbarAuthButton";
import UserStatsBadge from "@/components/navbar/UserStatsBadge";

export function Navbar() {
  const navPillClass = [
    "inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-semibold shadow-sm transition",
    "hover:-translate-y-0.5 hover:shadow ui-btn-secondary border-app text-muted hover:text-app",
  ].join(" ");

  return (
    <header className="border-b border-app bg-app transition">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 py-4">

        <div className="flex items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center" aria-label="TatvaOps home">
            <Image
              src="/tatvaops-logo.png"
              alt="TatvaOps"
              width={430}
              height={108}
              className="h-12 w-auto rounded-md object-contain sm:h-14 dark:brightness-95"
              priority
            />
          </Link>
          <UserStatsBadge />
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          <Link href="/"          className={navPillClass}>Home</Link>
          <Link href="/blog"      className={navPillClass}>Blogs</Link>
          <Link href="/forums"    className={navPillClass}>Forums</Link>

          <Link href="/shorts"   className={navPillClass}>Shorts</Link>
          <Link href="/inshorts" className={navPillClass}>Tatva Inshorts</Link>

          <Link href="/tutorials" className={navPillClass}>Tutorials</Link>
          <Link href="/ask" className={`${navPillClass} ui-btn-primary border-transparent hover:text-white`}>
            Ask AI
          </Link>

          <Link href="/saved" className={`${navPillClass} gap-1.5`} aria-label="Saved articles">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Saved
          </Link>

          <ThemeToggle />
          <NotificationBell />
          <NavbarAuthButton pillClass={navPillClass} />

          <Link href="/admin/login" className={navPillClass}>Admin</Link>
        </nav>
      </div>
    </header>
  );
}
