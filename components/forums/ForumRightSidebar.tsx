import type { ReactNode } from "react";

export function ForumRightSidebar({ children }: { children: ReactNode }) {
  return <div className="flex h-fit flex-col gap-6 lg:sticky lg:top-[88px]">{children}</div>;
}
