"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AskAiFab() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  const getHref = () => {
    if (pathname.startsWith("/projects/")) {
      const slug = pathname.replace(/^\/projects\//, "");
      return `/ask?anchor=sj:${encodeURIComponent(slug)}&sourceType=siteJournal&aiMode=site_analyst&page=site_journal&intent=${encodeURIComponent("Explain execution risks for this site journal")}`;
    }
    if (pathname.startsWith("/blog/")) {
      const slug = pathname.replace(/^\/blog\//, "");
      return `/ask?anchor=${encodeURIComponent(slug)}&sourceType=blog&aiMode=planning_engineer&page=blog&intent=${encodeURIComponent("Summarize key takeaways and practical site actions")}`;
    }
    if (pathname.startsWith("/forums/")) {
      const slug = pathname.replace(/^\/forums\//, "");
      return `/ask?anchor=fr:${encodeURIComponent(slug)}&sourceType=forum&aiMode=debate_synthesizer&page=forum&intent=${encodeURIComponent("Summarize consensus and conflicts in this discussion")}`;
    }
    return "/ask";
  };

  return (
    <Link
      href={getHref()}
      title="Ask AI"
      aria-label="Ask AI"
      className="fixed bottom-4 right-4 z-[100] flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition hover:scale-105 sm:bottom-6 sm:right-6 sm:h-12 sm:w-12"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m12 2 2.45 4.97L20 7.8l-4 3.9.94 5.5L12 14.9l-4.94 2.6.94-5.5-4-3.9 5.55-.83L12 2Z" />
      </svg>
    </Link>
  );
}
