import Image from "next/image";
import Link from "next/link";
import { NotificationBell } from "@/components/layout/NotificationBell";

export function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="TatvaOps home">
          <Image
            src="/tatvaops-logo.png"
            alt="TatvaOps"
            width={234}
            height={60}
            className="h-12 w-auto sm:h-14"
            priority
          />
        </Link>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-600">
          <Link href="/" className="transition hover:text-slate-900">
            Home
          </Link>
          <Link href="/blog" className="transition hover:text-slate-900">
            Blog
          </Link>
          <Link
            href="/saved"
            className="inline-flex items-center gap-1 transition hover:text-slate-900"
            aria-label="Saved articles"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Saved
          </Link>
          <NotificationBell />
          <Link href="/admin/login" className="transition hover:text-slate-900">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
