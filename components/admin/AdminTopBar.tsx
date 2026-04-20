"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ROUTE_LABELS: { pattern: RegExp; label: string; parent?: { label: string; href: string } }[] = [
  { pattern: /^\/admin\/forums/,    label: "Forums",   parent: { label: "Content",    href: "/admin/forums" } },
  { pattern: /^\/admin\/blog\/new/, label: "New Post", parent: { label: "Blogs",      href: "/admin/blog"   } },
  { pattern: /^\/admin\/blog\/edit/,label: "Edit Post",parent: { label: "Blogs",      href: "/admin/blog"   } },
  { pattern: /^\/admin\/blog/,      label: "Blogs",    parent: { label: "Content",    href: "/admin/blog"   } },
  { pattern: /^\/admin\/comments/,  label: "Comments", parent: { label: "Moderation", href: "/admin/comments" } },
  { pattern: /^\/admin\/stats/,     label: "Analytics",parent: { label: "System",     href: "/admin/stats"  } },
];

export function AdminTopBar() {
  const pathname = usePathname();
  const route = ROUTE_LABELS.find((r) => r.pattern.test(pathname));
  const label = route?.label ?? "Admin";
  const parent = route?.parent;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-app bg-surface px-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link href="/admin/forums" className="text-muted transition hover:text-app">
          Admin
        </Link>
        {parent && (
          <>
            <span className="text-faint">/</span>
            <Link href={parent.href} className="text-muted transition hover:text-app">
              {parent.label}
            </Link>
          </>
        )}
        <span className="text-faint">/</span>
        <span className="font-medium text-app">{label}</span>
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted transition hover:text-app"
        >
          View site ↗
        </Link>
        <div className="hidden items-center gap-1 rounded border border-app px-1.5 py-0.5 text-[11px] text-muted sm:flex">
          <kbd className="font-mono">⌘</kbd>
          <kbd className="font-mono">K</kbd>
        </div>
      </div>
    </header>
  );
}
