"use client";

// DO NOT MODIFY INTERNAL LOGIC OR JSX STRUCTURE
// Wraps main content area with sidebar offset on non-admin pages

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Admin has its own AdminSidebar — no offset needed there
  if (pathname.startsWith("/admin")) return <>{children}</>;
  /* Extra offset vs sidebar so main column + navbar do not hug the rail */
  return <div className="min-w-0 w-full ml-0 md:ml-[140px] md:w-[calc(100%-140px)]">{children}</div>;
}
