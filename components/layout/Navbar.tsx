import Image from "next/image";
import Link from "next/link";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export function Navbar() {
  const navPillClass =
    "inline-flex items-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 hover:shadow";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="TatvaOps home">
          <Image
            src="/tatvaops-logo.png"
            alt="TatvaOps"
            width={286}
            height={72}
            className="h-14 w-auto sm:h-16"
            priority
          />
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          <Link href="/" className={navPillClass}>
            Home
          </Link>
          <Link href="/blog" className={navPillClass}>
            Blogs
          </Link>
          <Link href="/forums" className={navPillClass}>
            Forums
          </Link>
          <Link href="/shorts" className={`${navPillClass} gap-1.5`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Shorts
          </Link>
          <Link href="/tutorials" className={navPillClass}>
            Tutorials
          </Link>
          <Link
            href="/saved"
            className={`${navPillClass} gap-1.5`}
            aria-label="Saved articles"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Saved
          </Link>
          <ThemeToggle />
          <NotificationBell />
          <Link href="/admin/login" className={navPillClass}>
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
