import type { Metadata } from "next";
import Link from "next/link";
import { ForumComposer } from "@/components/forums/ForumComposer";

export const metadata: Metadata = {
  title: "New Forum Post",
  description: "Start a discussion on TatvaOps Forums.",
  robots: { index: false },
};

export default function NewForumPostPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-10">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/forums" className="transition hover:text-slate-900">
          Forums
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-700">New post</span>
      </nav>

      <h1 className="mb-2 text-2xl font-extrabold text-slate-900">Start a discussion</h1>
      <p className="mb-8 text-sm text-slate-500">
        Share knowledge, ask a question, or kick off a debate. Markdown is supported.
      </p>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <ForumComposer />
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Be respectful, stay on topic, and add value to the conversation.
      </p>
    </main>
  );
}
