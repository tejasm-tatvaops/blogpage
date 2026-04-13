import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="TatvaOps home">
          <Image
            src="/tatvaops-logo.png"
            alt="TatvaOps"
            width={170}
            height={44}
            className="h-9 w-auto"
            priority
          />
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600 sm:gap-6">
          <Link href="/blog" className="transition hover:text-slate-900">
            Blog
          </Link>
          <Link href="/estimate" className="transition hover:text-slate-900">
            Estimate Tool
          </Link>
        </nav>
      </div>
    </header>
  );
}
