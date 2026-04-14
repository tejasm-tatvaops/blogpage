import Image from "next/image";
import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur">
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

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-slate-600">
          <Link href="/" className="transition hover:text-slate-900">
            Home
          </Link>
          <Link href="/blog" className="transition hover:text-slate-900">
            Blog
          </Link>
          <Link href="/admin/login" className="transition hover:text-slate-900">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
