"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useTheme, type ThemePreference } from "@/hooks/useTheme";
import type { ReactNode } from "react";

const THEME_LABEL: Record<ThemePreference, string> = {
  auto: "AUTO",
  light: "LIGHT",
  dark: "DARK",
};

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
  {
    href: "/projects",
    label: "SITE JOURNALS",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h18" />
        <path d="M6 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
        <path d="M13 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8 12h8M8 16h5" />
      </svg>
    ),
  },
];

function SidebarItem({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={[
        "relative flex w-full flex-col items-center gap-[5px] rounded-xl py-3 transition-all duration-200",
        active
          ? "text-orange-500 bg-subtle"
          : "text-muted hover:text-orange-500 dark:hover:text-orange-400 hover:bg-subtle/80",
      ].join(" ")}
    >
      {active && (
        <div className="absolute left-0 top-[20px] h-7 w-[3px] bg-gradient-to-b from-orange-500 to-orange-600 rounded-r-md" />
      )}
      <div className="flex items-center justify-center w-[22px] h-[22px]">{icon}</div>
      <div className="text-[0.6rem] font-medium tracking-[0.38px] leading-none">{label}</div>
    </Link>
  );
}

export function FloatingSidebar() {
  const pathname = usePathname();
  const { preference } = useTheme();

  // Don't render on admin pages — admin has its own sidebar
  if (pathname.startsWith("/admin")) return null;

  return (
    <aside className="hidden fixed left-[14px] top-1/2 z-[150] -translate-y-1/2 w-[88px] max-h-[calc(100vh-24px)] md:block">
      <div className="flex max-h-[calc(100vh-24px)] min-h-[min(520px,calc(100vh-24px))] flex-col items-center rounded-[28px] glass-sidebar px-0 pt-6 pb-4">
      {/* Brand strip */}
      <div className="flex shrink-0 flex-col gap-[4px] pb-4">
        <div className="w-9 h-2 bg-orange-500 rounded" />
        <div className="w-9 h-2 bg-orange-500/80 rounded" />
        <div className="w-9 h-2 bg-orange-500/80 rounded" />
        <div className="w-9 h-2 bg-orange-400/50 rounded" />
      </div>

      {/* Nav items — scroll when viewport is short so theme toggle stays visible */}
      <nav className="flex w-full min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <SidebarItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={isActive}
            />
          );
        })}
      </nav>

      {/* Theme toggle — always pinned below nav */}
      <div className="mt-2 flex w-full shrink-0 flex-col items-center gap-1.5 border-t border-app pt-3">
        <span className="text-[0.54rem] font-bold leading-none tracking-widest text-muted">
          {THEME_LABEL[preference]}
        </span>
        <ThemeToggle />
      </div>
      </div>
    </aside>
  );
}
