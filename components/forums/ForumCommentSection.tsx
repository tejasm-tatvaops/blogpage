"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Comment } from "@/lib/commentService";
import { getOrCreateFingerprint } from "@/lib/personalization";
import { useActivityPolling } from "@/lib/activityPolling";

type ForumCommentSectionProps = {
  slug: string;
  initialComments: Comment[];
  bestCommentId: string | null;
  creatorFingerprint: string | null;
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));

export function ForumCommentSection({
  slug,
  initialComments,
  bestCommentId: initialBestId,
  creatorFingerprint,
}: ForumCommentSectionProps) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");
  const [sortMode, setSortMode] = useState<"top" | "newest">("top");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyFor, setActiveReplyFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const [bestCommentId, setBestCommentId] = useState<string | null>(initialBestId);
  const [markingBest, setMarkingBest] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const totalCommentCount = useCallback(
    (list: Comment[]) => list.reduce((count, c) => count + 1 + c.replies.length, 0),
    [],
  );
  const pollComments = useCallback(async () => {
    const response = await fetch(`/api/forums/${encodeURIComponent(slug)}/comments`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return { comments: [] as Comment[] };
    return (await response.json()) as { comments: Comment[] };
  }, [slug]);
  const onPollData = useCallback((payload: { comments: Comment[] }) => {
    setComments((prev) => {
      const previousCount = totalCommentCount(prev);
      const incomingCount = totalCommentCount(payload.comments);
      if (incomingCount > previousCount) {
        const incoming = payload.comments[0];
        const typingName = incoming?.persona_name ?? incoming?.author_name ?? "Someone";
        setTypingUsers([typingName]);
        window.setTimeout(() => {
          setComments(payload.comments);
          setTypingUsers([]);
        }, 1200 + Math.floor(Math.random() * 1100));
        return prev;
      }
      return payload.comments;
    });
  }, [totalCommentCount]);
  const { hasNewActivity, clearNewActivity } = useActivityPolling<{ comments: Comment[] }>({
    intervalMs: 12_000,
    fetcher: pollComments,
    getVersion: (payload) => totalCommentCount(payload.comments),
    onData: onPollData,
  });

  // Is the current visitor the post creator?
  const isCreator =
    typeof document !== "undefined" &&
    !!creatorFingerprint &&
    (() => {
      const match = document.cookie.match(/(?:^|;\s*)tatvaops_fp=([^;]+)/);
      return match?.[1] === creatorFingerprint;
    })();

  const sortedComments = useMemo(() => {
    // Best answer always pinned first when sorting by "top"
    const clone = comments.map((c) => ({
      ...c,
      replies: [...c.replies].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    }));

    return clone.sort((a, b) => {
      if (sortMode === "newest") {
        // Best answer still pinned even in newest sort
        if (a.id === bestCommentId) return -1;
        if (b.id === bestCommentId) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (a.id === bestCommentId) return -1;
      if (b.id === bestCommentId) return 1;
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [comments, sortMode, bestCommentId]);

  const patchCommentTree = (
    list: Comment[],
    commentId: string,
    updater: (c: Comment) => Comment,
  ): Comment[] =>
    list.map((c) => {
      if (c.id === commentId) return updater(c);
      const nextReplies = c.replies.map((r) => (r.id === commentId ? updater(r) : r));
      return nextReplies !== c.replies ? { ...c, replies: nextReplies } : c;
    });

  const onSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/forums/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: authorName.trim(), content: content.trim() }),
      });
      const json = (await res.json()) as { error?: string; comment?: Comment };
      if (!res.ok) throw new Error(json.error ?? "Failed to post comment.");
      if (json.comment) setComments((prev) => [json.comment!, ...prev]);
      setContent("");
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const onReply = async (parentCommentId: string) => {
    const replyText = replyDrafts[parentCommentId]?.trim() ?? "";
    if (!replyText || !authorName.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/forums/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: authorName.trim(),
          content: replyText,
          parent_comment_id: parentCommentId,
        }),
      });
      const json = (await res.json()) as { error?: string; comment?: Comment };
      if (!res.ok) throw new Error(json.error ?? "Failed to post reply.");
      if (json.comment) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentCommentId
              ? { ...c, replies: [...c.replies, json.comment as Comment] }
              : c,
          ),
        );
      }
      setReplyDrafts((prev) => ({ ...prev, [parentCommentId]: "" }));
      setActiveReplyFor(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post reply.");
    } finally {
      setSubmitting(false);
    }
  };

  const onVote = async (commentId: string, direction: "up" | "down") => {
    if (votingCommentId) return;
    setVotingCommentId(commentId);
    setError(null);
    try {
      const res = await fetch(
        `/api/forums/${encodeURIComponent(slug)}/comments/${encodeURIComponent(commentId)}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ direction }),
        },
      );
      const json = (await res.json()) as {
        error?: string;
        id?: string;
        upvote_count?: number;
        downvote_count?: number;
        score?: number;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to vote.");
      if (json.id) {
        setComments((prev) =>
          patchCommentTree(prev, json.id as string, (c) => ({
            ...c,
            upvote_count: json.upvote_count ?? c.upvote_count,
            downvote_count: json.downvote_count ?? c.downvote_count,
            score: json.score ?? c.score,
          })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to vote.");
    } finally {
      setVotingCommentId(null);
    }
  };

  const onMarkBest = async (commentId: string) => {
    if (markingBest) return;
    setMarkingBest(true);
    try {
      const fp = getOrCreateFingerprint();
      const newId = bestCommentId === commentId ? "clear" : commentId;
      const res = await fetch(`/api/forums/${encodeURIComponent(slug)}/best-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ comment_id: newId }),
      });
      if (res.ok) {
        setBestCommentId(newId === "clear" ? null : commentId);
      }
      void fp; // fingerprint is sent via cookie header automatically
    } finally {
      setMarkingBest(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-indigo-400 transition placeholder:text-slate-400 focus:ring-2";

  const renderComment = (c: Comment, isReply = false) => {
    const isBest = c.id === bestCommentId;
    return (
      <div key={c.id} className={`flex gap-3 ${isBest && !isReply ? "rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 -mx-3" : ""}`}>
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${isBest ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
          {c.author_name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{c.author_name}</span>
            <time className="text-xs text-slate-400" dateTime={c.created_at}>
              {formatDate(c.created_at)}
            </time>
            {isBest && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Best answer
              </span>
            )}
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{c.content}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <button
              type="button"
              disabled={votingCommentId === c.id}
              onClick={() => onVote(c.id, "up")}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
            >
              ▲ {c.upvote_count}
            </button>
            <button
              type="button"
              disabled={votingCommentId === c.id}
              onClick={() => onVote(c.id, "down")}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 disabled:opacity-50"
            >
              ▼ {c.downvote_count}
            </button>
            {!isReply && (
              <button
                type="button"
                onClick={() => setActiveReplyFor((prev) => (prev === c.id ? null : c.id))}
                className="rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50"
              >
                Reply
              </button>
            )}
            {/* Mark best answer — only visible to post creator */}
            {isCreator && !isReply && (
              <button
                type="button"
                disabled={markingBest}
                onClick={() => onMarkBest(c.id)}
                className={`rounded-md border px-2 py-1 text-xs transition disabled:opacity-50 ${
                  isBest
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-white"
                    : "border-slate-200 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {isBest ? "Unmark best" : "Mark as best"}
              </button>
            )}
          </div>

          {activeReplyFor === c.id && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <textarea
                value={replyDrafts[c.id] ?? ""}
                onChange={(e) =>
                  setReplyDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                }
                rows={3}
                maxLength={2000}
                placeholder="Write a reply…"
                className={inputClass}
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={
                    !authorName.trim() || !(replyDrafts[c.id] ?? "").trim() || submitting
                  }
                  onClick={() => onReply(c.id)}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Posting…" : "Post reply"}
                </button>
              </div>
            </div>
          )}

          {c.replies.length > 0 && (
            <div className="mt-4 space-y-3 border-l-2 border-indigo-100 pl-4">
              {c.replies.map((reply) => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="mt-12 border-t border-slate-200 pt-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">
          {comments.length > 0
            ? `${comments.length} Repl${comments.length !== 1 ? "ies" : "y"}`
            : "Discussion"}
        </h2>
        <div className="flex gap-2">
          {(["top", "newest"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSortMode(mode)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                sortMode === mode
                  ? "bg-slate-900 !text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {mode === "top" ? "Top" : "Newest"}
            </button>
          ))}
        </div>
      </div>

      {hasNewActivity && (
        <button
          type="button"
          onClick={() => clearNewActivity()}
          className="mb-4 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          New activity detected
        </button>
      )}
      {typingUsers.length > 0 && (
        <div className="mb-3 text-xs font-medium text-slate-500">{typingUsers.join(", ")} is typing...</div>
      )}

      {/* Comment form */}
      <form onSubmit={onSubmit} className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="mb-4 text-sm font-semibold text-slate-700">Join the discussion</p>
        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {success && (
          <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Reply posted!
          </p>
        )}
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your name (or leave as Anonymous)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            maxLength={80}
            required
            className={inputClass}
          />
          <textarea
            placeholder="Share your thoughts…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            rows={4}
            required
            className={inputClass}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">{content.length}/2000</span>
          <button
            type="submit"
            disabled={submitting || !authorName.trim() || !content.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post reply"}
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
          No replies yet. Start the discussion!
        </p>
      ) : (
        <div className="space-y-5">{sortedComments.map((c) => renderComment(c))}</div>
      )}
    </section>
  );
}
