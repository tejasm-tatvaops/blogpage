import type { ReactNode } from "react";

export interface ForumLayoutProps {
  main: ReactNode;
  sidebar: ReactNode;
}

export function ForumLayout({ main, sidebar }: ForumLayoutProps) {
  return (
    <div className="mx-auto max-w-[1440px] px-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <section className="min-w-0">{main}</section>
        <aside className="min-w-0 lg:w-[280px]">{sidebar}</aside>
      </div>
    </div>
  );
}
