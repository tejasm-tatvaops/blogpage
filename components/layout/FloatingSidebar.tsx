"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

// DO NOT MODIFY INTERNAL LOGIC OR JSX STRUCTURE
// ONLY APPLY STYLING OR WRAPPING

const NAV_ITEMS = [
  {
    href: "/",
    label: "HOME",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9,22 9,12 15,12 15,22" />
      </svg>
    ),
  },
  {
    href: "/blog",
    label: "BLOGS",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: "/forums",
    label: "FORUMS",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/shorts",
    label: "SHORTS",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/inshorts",
    label: "INSHORTS",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    href: "/tutorials",
    label: "TUTORIALS",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
];

export function FloatingSidebar() {
  const pathname = usePathname();

  // Don't render on admin pages — admin has its own sidebar
  if (pathname.startsWith("/admin")) return null;

  return (
    <aside className="fixed left-2 top-20 z-40 flex w-[88px] flex-col items-center gap-1 rounded-2xl glass-sidebar py-4">
      {/* 2×2 brand mark (matches reference design) */}
      <div className="mb-4 grid grid-cols-2 gap-[5px] px-5">
        <span className="h-[18px] w-[18px] rounded-[4px] bg-orange-500" />
        <span className="h-[18px] w-[18px] rounded-[4px] bg-orange-500" />
        <span className="h-[18px] w-[18px] rounded-[4px] bg-orange-500" />
        <span className="h-[18px] w-[18px] rounded-[4px] bg-orange-500" />
      </div>

      {/* Nav items */}
      <div className="flex w-full flex-col items-center gap-0.5 px-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={[
                "relative flex w-full flex-col items-center gap-[5px] rounded-xl py-[10px] text-[9px] font-bold tracking-widest transition-all duration-200",
                isActive
                  ? "text-orange-400 bg-orange-500/10"
                  : "text-faint hover:text-app hover:bg-subtle",
              ].join(" ")}
            >
              {isActive && (
                <span
                  className="sidebar-active-glow absolute left-0 top-[20%] h-[60%] w-[2.5px] rounded-r-full bg-gradient-to-b from-orange-400 to-orange-600"
                />
              )}
              {icon}
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Dark / Light toggle at bottom */}
      <div className="mt-auto flex w-full flex-col items-center gap-1.5 px-2 pt-4">
        <span className="text-[9px] font-bold tracking-widest text-faint">DARK</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
