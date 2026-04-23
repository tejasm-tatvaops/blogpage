"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Comment } from "@/lib/commentService";
import { getOrCreateFingerprint } from "@/lib/personalization";
import { useActivityPolling } from "@/lib/activityPolling";
import { getUserAvatar } from "@/lib/identityUI";
import { UserProfileQuickView } from "@/components/users/UserProfileQuickView";

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
    (list: Comment[]) =>
      list.reduce(
        (count, c) =>
          count + 1 + c.replies.reduce((rc, r) => rc + 1 + r.replies.length, 0),
        0,
      ),
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
    intervalMs: 30_000,
    fetcher: pollComments,
    getVersion: (payload) => totalCommentCount(payload.comments),
    onData: onPollData,
  });

  const isCreator =
    typeof document !== "undefined" &&
    !!creatorFingerprint &&
    (() => {
      const match = document.cookie.match(/(?:^|;\s*)tatvaops_fp=([^;]+)/);
      return match?.[1] === creatorFingerprint;
    })();

  const sortByDate = (a: Comment, b: Comment) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

  const sortedComments = useMemo(() => {
    const clone = comments.map((c) => ({
      ...c,
      replies: [...c.replies]
        .sort(sortByDate)
        .map((r) => ({ ...r, replies: [...r.replies].sort(sortByDate) })),
    }));

    return clone.sort((a, b) => {
      if (sortMode === "newest") {
        if (a.id === bestCommentId) return -1;
        if (b.id === bestCommentId) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (a.id === bestCommentId) return -1;
      if (b.id === bestCommentId) return 1;
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments, sortMode, bestCommentId]);

  const patchCommentTree = (
    list: Comment[],
    commentId: string,
    updater: (c: Comment) => Comment,
  ): Comment[] =>
    list.map((c) => {
      if (c.id === commentId) return updater(c);
      const nextReplies = c.replies.map((r) => {
        if (r.id === commentId) return updater(r);
        const nextNested = r.replies.map((nested) =>
          nested.id === commentId ? updater(nested) : nested,
        );
        return nextNested !== r.replies ? { ...r, replies: nextNested } : r;
      });
      return nextReplies !== c.replies ? { ...c, replies: nextReplies } : c;
    });

  const onSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    const submitAuthor = authorName.trim() || "Anonymous";
    try {
      const res = await fetch(`/api/forums/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: submitAuthor, content: content.trim() }),
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
    const replyAuthor = authorName.trim() || "Anonymous";
    if (!replyText || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/forums/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: replyAuthor,
          content: replyText,
          parent_comment_id: parentCommentId,
        }),
      });
      const json = (await res.json()) as { error?: string; comment?: Comment };
      if (!res.ok) throw new Error(json.error ?? "Failed to post reply.");
      if (json.comment) {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === parentCommentId) {
              return { ...c, replies: [...c.replies, json.comment as Comment] };
            }
            const replyIdx = c.replies.findIndex((r) => r.id === parentCommentId);
            if (replyIdx !== -1) {
              const updatedReplies = c.replies.map((r, i) =>
                i === replyIdx
                  ? { ...r, replies: [...r.replies, json.comment as Comment] }
                  : r,
              );
              return { ...c, replies: updatedReplies };
            }
            return c;
          }),
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
      void fp;
    } finally {
      setMarkingBest(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-app bg-surface px-3 py-2 text-sm text-app outline-none ring-indigo-400 transition placeholder:text-slate-400 focus:ring-2";

  const renderComment = (c: Comment, depth: 0 | 1 | 2 = 0) => {
    const isBest = c.id === bestCommentId && depth === 0;
    return (
      <div
        key={c.id}
        className={`flex gap-3 ${isBest ? "rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 -mx-3" : ""}`}
      >
        <UserProfileQuickView
          displayName={c.author_name}
          identityKey={c.identity_key ?? `legacy:comment:${c.id}`}
          trigger={(() => {
            const avatar = getUserAvatar(c);
            return (
              <div className="transition-transform duration-200 hover:scale-105">
                {avatar.type === "initials" ? (
                  <div
                    className={`h-9 w-9 flex-shrink-0 rounded-full flex items-center justify-center text-white text-sm font-semibold bg-gradient-to-br ${avatar.gradient} border border-white/10 shadow-sm ring-1 ring-white/5`}
                  >
                    {avatar.name.slice(0, 2).toUpperCase()}
                  </div>
                ) : (
                  <img
                    src={avatar.src}
                    alt="User avatar"
                    className={`h-9 w-9 flex-shrink-0 rounded-full object-cover border border-white/10 shadow-sm ring-1 ring-white/5 ${
                      avatar.type === "dicebear" ? "opacity-90" : ""
                    }`}
                    loading="lazy"
                  />
                )}
              </div>
            );
          })()}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <UserProfileQuickView
              displayName={c.author_name}
              identityKey={c.identity_key ?? `legacy:comment:${c.id}`}
              trigger={
                <span className="text-sm font-semibold text-app hover:underline">
                  {c.is_deleted ? "[deleted]" : c.author_name}
                </span>
              }
            />
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

          {c.is_deleted ? (
            <p className="mt-1 text-sm italic text-slate-400">[deleted]</p>
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{c.content}</p>
          )}

          {!c.is_deleted && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <button
                type="button"
                disabled={votingCommentId === c.id}
                onClick={() => onVote(c.id, "up")}
                className="inline-flex items-center gap-1 rounded-md border border-app px-2 py-1 hover:bg-subtle disabled:opacity-50"
              >
                ▲ {c.upvote_count}
              </button>
              <button
                type="button"
                disabled={votingCommentId === c.id}
                onClick={() => onVote(c.id, "down")}
                className="inline-flex items-center gap-1 rounded-md border border-app px-2 py-1 hover:bg-subtle disabled:opacity-50"
              >
                ▼ {c.downvote_count}
              </button>
              {/* Reply button — only at depth 0 and 1 (max depth 2) */}
              {depth < 2 && (
                <button
                  type="button"
                  onClick={() => setActiveReplyFor((prev) => (prev === c.id ? null : c.id))}
                  className="rounded-md border border-app px-2 py-1 hover:bg-subtle"
                >
                  Reply
                </button>
              )}
              {/* Mark best — only root comments, only for post creator */}
              {isCreator && depth === 0 && (
                <button
                  type="button"
                  disabled={markingBest}
                  onClick={() => onMarkBest(c.id)}
                  className={`rounded-md border px-2 py-1 text-xs transition disabled:opacity-50 ${
                    isBest
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-surface"
                      : "border-app text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  {isBest ? "Unmark best" : "Mark as best"}
                </button>
              )}
            </div>
          )}

          {activeReplyFor === c.id && (
            <div className="mt-3 rounded-lg border border-app bg-subtle p-3">
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
                  disabled={!(replyDrafts[c.id] ?? "").trim() || submitting}
                  onClick={() => onReply(c.id)}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Posting…" : "Post reply"}
                </button>
              </div>
            </div>
          )}

          {c.replies.length > 0 && (
            <div className="mt-4 space-y-4 border-l-2 border-indigo-100 pl-4">
              {c.replies.map((reply) => renderComment(reply, (depth + 1) as 0 | 1 | 2))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="mt-12 border-t border-app pt-10">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-app">
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
      <form onSubmit={onSubmit} className="mb-10 rounded-2xl border border-app bg-subtle p-5">
        <p className="mb-4 text-sm font-semibold text-slate-700">Join the discussion</p>
        <p className="-mt-2 mb-4 text-xs text-slate-500">Name is optional. If left blank, we&apos;ll post as Anonymous.</p>
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
            placeholder="Your name (optional)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            maxLength={80}
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
            disabled={submitting || !content.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post reply"}
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-app p-6 text-center text-sm text-slate-500">
          No replies yet. Start the discussion!
        </p>
      ) : (
        <div className="space-y-5">{sortedComments.map((c) => renderComment(c))}</div>
      )}
    </section>
  );
}
