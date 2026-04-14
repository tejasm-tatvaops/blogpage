"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AdminComment } from "@/lib/commentService";

type AdminCommentTableProps = {
  comments: AdminComment[];
};

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));

export function AdminCommentTable({ comments }: AdminCommentTableProps) {
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
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Comment Moderation</h1>
        <Link
          href="/admin/blog"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back to posts
        </Link>
      </div>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {comments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
          No comments found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Author</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Comment</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Votes</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-600">Date</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {comments.map((comment) => (
                <tr key={comment.id}>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{comment.author_name}</td>
                  <td className="max-w-xl px-4 py-3 text-sm text-slate-700">
                    <p className="line-clamp-2">{comment.content}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {comment.parent_comment_id ? "Reply" : "Top-level"} · Post ID: {comment.post_id}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    ↑ {comment.upvote_count} / ↓ {comment.downvote_count}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(comment.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                    >
                      {deletingId === comment.id ? "Deleting..." : "Delete"}
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
