"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const IconBlogs = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="1.5" rx=".75" fill="currentColor" opacity=".9" />
    <rect x="2" y="6.5" width="9" height="1.5" rx=".75" fill="currentColor" opacity=".6" />
    <rect x="2" y="10" width="10" height="1.5" rx=".75" fill="currentColor" opacity=".6" />
    <rect x="2" y="13" width="6" height="1.5" rx=".75" fill="currentColor" opacity=".4" />
  </svg>
);

const IconForums = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v6A1.5 1.5 0 0112.5 11H9l-3 3v-3H3.5A1.5 1.5 0 012 9.5v-6z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
  </svg>
);

const IconComments = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v5a2 2 0 01-2 2H7l-3 2.5V11H4a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    <path d="M5 7h6M5 5h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

const IconJobs = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.25" />
    <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconVideos = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <path d="M14 5.5l-4 2.5 4 2.5V5.5z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    <rect x="1" y="4" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
  </svg>
);

const IconAnalytics = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="9" width="3" height="5" rx=".75" fill="currentColor" opacity=".8" />
    <rect x="6.5" y="5" width="3" height="9" rx=".75" fill="currentColor" opacity=".8" />
    <rect x="11" y="2" width="3" height="12" rx=".75" fill="currentColor" opacity=".8" />
  </svg>
);

const IconUsers = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.25" />
    <path d="M2.5 13.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
  </svg>
);

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Content",
    items: [
      { label: "Blogs",    href: "/admin/blog",     icon: <IconBlogs /> },
      { label: "Forums",   href: "/admin/forums",   icon: <IconForums /> },
      { label: "Comments", href: "/admin/comments", icon: <IconComments /> },
      { label: "Videos",         href: "/admin/videos",   icon: <IconVideos /> },
      { label: "Tatva Inshorts", href: "/admin/inshorts", icon: <IconVideos /> },
      { label: "Tutorials", href: "/admin/tutorials", icon: <IconBlogs /> },
      { label: "Tutorial Drafts", href: "/admin/tutorials/drafts", icon: <IconJobs /> },
    ],
  },
  {
    label: "Generation",
    items: [
      { label: "Jobs", href: "/admin/forums", icon: <IconJobs /> },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Analytics",   href: "/admin/stats",      icon: <IconAnalytics /> },
      { label: "Users",       href: "/users",             icon: <IconUsers /> },
      { label: "Reputation",  href: "/admin/reputation",  icon: <IconUsers /> },
      { label: "Review Queue",href: "/admin/review-queue",icon: <IconBlogs /> },
      { label: "Ingest",      href: "/admin/ingest",      icon: <IconJobs /> },
    ],
  },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
        isActive
          ? "bg-slate-100 font-medium text-app"
          : "text-slate-600 hover:bg-subtle hover:text-app"
      } ${collapsed ? "justify-center px-2" : ""}`}
    >
      <span className={`shrink-0 ${isActive ? "text-slate-800" : "text-slate-400 group-hover:text-slate-600"}`}>
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {isActive && !collapsed && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-slate-800" />
      )}
    </Link>
  );
}

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-app bg-surface transition-all duration-200 ${
        collapsed ? "w-[52px]" : "w-[210px]"
      }`}
    >
      {/* Logo / workspace */}
      <div className={`flex h-14 items-center border-b border-app px-3 ${collapsed ? "justify-center" : "gap-2.5"}`}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">
          T
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-slate-800">TatvaOps</p>
            <p className="truncate text-[10px] text-slate-400">Admin</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href + item.label} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-app p-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`flex w-full items-center rounded-lg px-2.5 py-1.5 text-slate-400 transition hover:bg-subtle hover:text-slate-600 ${
            collapsed ? "justify-center" : "gap-2"
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className={`shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`}>
            <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
