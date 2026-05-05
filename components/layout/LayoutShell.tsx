"use client";

// DO NOT MODIFY INTERNAL LOGIC OR JSX STRUCTURE
// Wraps main content area with sidebar offset on non-admin pages

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Admin has its own AdminSidebar — no offset needed there
  if (pathname.startsWith("/admin")) return <>{children}</>;
  /* Keep a consistent content gutter relative to the sidebar */
  return <div className="min-w-0 w-full ml-0 md:ml-[120px] md:w-[calc(100%-120px)]">{children}</div>;
}
