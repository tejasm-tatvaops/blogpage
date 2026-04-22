"use client";

import { type FormEvent, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Comment } from "@/lib/commentService";
import { useActivityPolling } from "@/lib/activityPolling";
import { getAvatarForIdentity } from "@/lib/avatar";
import { UserProfileQuickView } from "@/components/users/UserProfileQuickView";

type CommentSectionProps = {
  slug: string;
  initialComments: Comment[];
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));

export function CommentSection({ slug, initialComments }: CommentSectionProps) {
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
      const response = await fetch(`/api/blog/${encodeURIComponent(slug)}/comments`, {
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
        }, 1300 + Math.floor(Math.random() * 1200));
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

  const sortByDate = (a: Comment, b: Comment) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

  const sortedComments = useMemo(() => {
    const clone = comments.map((c) => ({
      ...c,
      replies: [...c.replies]
        .sort(sortByDate)
        .map((r) => ({
          ...r,
          replies: [...r.replies].sort(sortByDate),
        })),
    }));

    return clone.sort((a, b) => {
      if (sortMode === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments, sortMode]);

  const patchCommentTree = (
    commentList: Comment[],
    commentId: string,
    updater: (comment: Comment) => Comment,
  ): Comment[] =>
    commentList.map((comment) => {
      if (comment.id === commentId) return updater(comment);
      const nextReplies = comment.replies.map((reply) => {
        if (reply.id === commentId) return updater(reply);
        const nextNested = reply.replies.map((nested) =>
          nested.id === commentId ? updater(nested) : nested,
        );
        return nextNested !== reply.replies ? { ...reply, replies: nextNested } : reply;
      });
      return nextReplies !== comment.replies ? { ...comment, replies: nextReplies } : comment;
    });

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: authorName.trim(), content: content.trim() }),
      });

      const json = (await res.json()) as { error?: string; comment?: Comment };
      if (!res.ok) throw new Error(json.error ?? "Failed to post comment.");

      if (json.comment) {
        setComments((prev) => [json.comment!, ...prev]);
      }
      setAuthorName("");
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
    if (!replyText || !authorName.trim()) return;
    if (submitting) return;

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/comments`, {
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
          prev.map((comment) => {
            if (comment.id === parentCommentId) {
              return { ...comment, replies: [...comment.replies, json.comment as Comment] };
            }
            const replyIdx = comment.replies.findIndex((r) => r.id === parentCommentId);
            if (replyIdx !== -1) {
              const updatedReplies = comment.replies.map((r, i) =>
                i === replyIdx
                  ? { ...r, replies: [...r.replies, json.comment as Comment] }
                  : r,
              );
              return { ...comment, replies: updatedReplies };
            }
            return comment;
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
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/comments/${encodeURIComponent(commentId)}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
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
          patchCommentTree(prev, json.id as string, (comment) => ({
            ...comment,
            upvote_count: json.upvote_count ?? comment.upvote_count,
            downvote_count: json.downvote_count ?? comment.downvote_count,
            score: json.score ?? comment.score,
          })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to vote.");
    } finally {
      setVotingCommentId(null);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-app bg-surface px-3 py-2 text-sm text-app outline-none ring-sky-400 transition placeholder:text-slate-400 focus:ring-2";

  return (
    <section className="mt-14 border-t border-app pt-6">
      <h2 className="mb-3 text-base font-semibold normal-case tracking-normal text-black dark:text-white">
        Discuss this article
      </h2>
      {/* Discuss this article strip */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 transition hover:bg-sky-50/80">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sky-800">Join the conversation</p>
          <p className="text-sm text-sky-600/80">Share your thoughts, ask questions, or start a discussion below.</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-sky-200 bg-surface px-3 py-1.5 text-xs font-medium text-sky-700 transition hover:bg-sky-100"
        >
          Comment
        </button>
      </div>

      <h2 className="mb-6 text-xl font-bold text-app">
        {comments.length > 0 ? `${comments.length} Comment${comments.length > 1 ? "s" : ""}` : "Comments"}
      </h2>

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

      <div className="mb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSortMode("top")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            sortMode === "top" ? "bg-slate-900 !text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Top
        </button>
        <button
          type="button"
          onClick={() => setSortMode("newest")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            sortMode === "newest"
              ? "bg-slate-900 !text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Newest
        </button>
      </div>

      {/* Comment form */}
      <form onSubmit={onSubmit} className="mb-10 rounded-2xl border border-app bg-subtle p-5">
        <p className="mb-4 text-sm font-semibold text-slate-700">Add a comment</p>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {success && (
          <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Comment posted!
          </p>
        )}

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Your name"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            maxLength={80}
            required
            className={inputClass}
          />
          <textarea
            placeholder="Share your thoughts or questions…"
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
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post comment"}
          </button>
        </div>
      </form>

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-app p-6 text-center text-sm text-slate-500">
          No comments yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="space-y-5">
          {sortedComments.map((c) => (
            <div key={c.id} className="flex gap-3">
              {/* Avatar */}
              <UserProfileQuickView
                displayName={c.author_name}
                trigger={
                  <img
                    src={getAvatarForIdentity(`blog-comment:${c.author_name}|${c.id}`)}
                    alt={`${c.author_name} avatar`}
                    className="h-9 w-9 flex-shrink-0 rounded-full border border-app bg-slate-100 object-cover"
                    loading="lazy"
                  />
                }
              />
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <UserProfileQuickView
                    displayName={c.author_name}
                    trigger={<span className="text-sm font-semibold text-app hover:underline">{c.author_name}</span>}
                  />
                  <time className="text-xs text-slate-400" dateTime={c.created_at}>
                    {formatDate(c.created_at)}
                  </time>
                </div>
                {c.is_deleted ? (
                  <p className="mt-1 text-sm italic text-slate-400">[deleted]</p>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {c.content}
                  </p>
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
                    <button
                      type="button"
                      onClick={() => setActiveReplyFor((prev) => (prev === c.id ? null : c.id))}
                      className="rounded-md border border-app px-2 py-1 hover:bg-subtle"
                    >
                      Reply
                    </button>
                  </div>
                )}

                {activeReplyFor === c.id && (
                  <div className="mt-3 rounded-lg border border-app bg-subtle p-3">
                    <textarea
                      value={replyDrafts[c.id] ?? ""}
                      onChange={(e) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [c.id]: e.target.value,
                        }))
                      }
                      rows={3}
                      maxLength={2000}
                      placeholder="Write a reply..."
                      className={inputClass}
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={!authorName.trim() || !(replyDrafts[c.id] ?? "").trim() || submitting}
                        onClick={() => onReply(c.id)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        {submitting ? "Posting..." : "Post reply"}
                      </button>
                    </div>
                  </div>
                )}

                {c.replies.length > 0 && (
                  <div className="mt-4 space-y-4 border-l border-app pl-4">
                    {c.replies.map((reply) => (
                      <div key={reply.id}>
                        <div className="flex items-baseline gap-2">
                          <UserProfileQuickView
                            displayName={reply.author_name}
                            trigger={<span className="text-sm font-semibold text-app hover:underline">{reply.author_name}</span>}
                          />
                          <time className="text-xs text-slate-400" dateTime={reply.created_at}>
                            {formatDate(reply.created_at)}
                          </time>
                        </div>
                        {reply.is_deleted ? (
                          <p className="mt-1 text-sm italic text-slate-400">[deleted]</p>
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {reply.content}
                          </p>
                        )}
                        {!reply.is_deleted && (
                          <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                            <button
                              type="button"
                              disabled={votingCommentId === reply.id}
                              onClick={() => onVote(reply.id, "up")}
                              className="inline-flex items-center gap-1 rounded-md border border-app px-2 py-1 hover:bg-subtle disabled:opacity-50"
                            >
                              ▲ {reply.upvote_count}
                            </button>
                            <button
                              type="button"
                              disabled={votingCommentId === reply.id}
                              onClick={() => onVote(reply.id, "down")}
                              className="inline-flex items-center gap-1 rounded-md border border-app px-2 py-1 hover:bg-subtle disabled:opacity-50"
                            >
                              ▼ {reply.downvote_count}
                            </button>
                            {/* Reply button only at depth 1 (max depth is 2) */}
                            <button
                              type="button"
                              onClick={() => setActiveReplyFor((prev) => (prev === reply.id ? null : reply.id))}
                              className="rounded-md border border-app px-2 py-1 hover:bg-subtle"
                            >
                              Reply
                            </button>
                          </div>
                        )}

                        {activeReplyFor === reply.id && (
                          <div className="mt-3 rounded-lg border border-app bg-subtle p-3">
                            <textarea
                              value={replyDrafts[reply.id] ?? ""}
                              onChange={(e) =>
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [reply.id]: e.target.value,
                                }))
                              }
                              rows={3}
                              maxLength={2000}
                              placeholder="Write a reply..."
                              className={inputClass}
                            />
                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                disabled={!authorName.trim() || !(replyDrafts[reply.id] ?? "").trim() || submitting}
                                onClick={() => onReply(reply.id)}
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold !text-white hover:bg-slate-700 disabled:opacity-50"
                              >
                                {submitting ? "Posting..." : "Post reply"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Depth-2 replies */}
                        {reply.replies.length > 0 && (
                          <div className="mt-3 space-y-3 border-l border-app pl-4">
                            {reply.replies.map((nested) => (
                              <div key={nested.id}>
                                <div className="flex items-baseline gap-2">
                                  <UserProfileQuickView
                                    displayName={nested.author_name}
                                    trigger={<span className="text-sm font-semibold text-app hover:underline">{nested.author_name}</span>}
                                  />
                                  <time className="text-xs text-slate-400" dateTime={nested.created_at}>
                                    {formatDate(nested.created_at)}
                                  </time>
                                </div>
                                {nested.is_deleted ? (
                                  <p className="mt-1 text-sm italic text-slate-400">[deleted]</p>
                                ) : (
                                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                    {nested.content}
                                  </p>
                                )}
                                {!nested.is_deleted && (
                                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                                    <button
                                      type="button"
                                      disabled={votingCommentId === nested.id}
                                      onClick={() => onVote(nested.id, "up")}
                                      className="inline-flex items-center gap-1 rounded-md border border-app px-2 py-1 hover:bg-subtle disabled:opacity-50"
                                    >
                                      ▲ {nested.upvote_count}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={votingCommentId === nested.id}
                                      onClick={() => onVote(nested.id, "down")}
                                      className="inline-flex items-center gap-1 rounded-md border border-app px-2 py-1 hover:bg-subtle disabled:opacity-50"
                                    >
                                      ▼ {nested.downvote_count}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
