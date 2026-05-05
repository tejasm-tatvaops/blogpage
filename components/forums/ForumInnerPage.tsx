import type { ReactNode } from "react";

type ForumInnerPageProps = {
  left: ReactNode;
  right: ReactNode;
};

export function ForumInnerPage({ left, right }: ForumInnerPageProps) {
  return (
    <div className="mt-[80px] px-4 md:px-10">
      <main className="mx-auto min-h-screen w-full max-w-[1440px]">
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_300px] lg:gap-5">
          <section className="min-w-0">{left}</section>
          <aside className="min-w-0">{right}</aside>
        </div>
      </main>
    </div>
  );
}
