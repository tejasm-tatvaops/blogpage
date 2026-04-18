"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminComment } from "@/lib/commentService";

type AdminCommentTableProps = {
  comments: AdminComment[];
  initialType?: "all" | "blog" | "forum";
};

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));

export function AdminCommentTable({ comments, initialType = "all" }: AdminCommentTableProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;

    setError(null);
    setDeletingId(id);
    try {
      const response = await fetch(`/api/admin/comments/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(json.error ?? "Failed to delete comment.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[1500px] px-6 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Comments</h1>
          <p className="text-sm text-slate-500">{comments.length} total</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {(["all", "blog", "forum"] as const).map((t) => (
          <Link
            key={t}
            href={`/admin/comments?type=${t}`}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition ${
              initialType === t
                ? "border-violet-300 bg-violet-50 text-violet-700"
                : "border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            {t}
          </Link>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
          No comments found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-white">
              <tr>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Author</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Comment</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Type</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Votes</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Date</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {comments.map((comment) => (
                <tr key={comment.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{comment.author_name}</td>
                  <td className="max-w-xl px-4 py-2.5 text-sm text-slate-600">
                    <p className="line-clamp-2">{comment.content}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {comment.parent_comment_id ? "Reply" : "Top-level"} · Post ID: {comment.post_id}
                    </p>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                      {comment.comment_type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm tabular-nums text-slate-500">
                    ↑{comment.upvote_count} ↓{comment.downvote_count}
                  </td>
                  <td className="px-4 py-2.5 text-sm tabular-nums text-slate-500">{formatDate(comment.created_at)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      className="text-xs font-medium text-slate-400 transition hover:text-red-600 disabled:opacity-50"
                    >
                      {deletingId === comment.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
