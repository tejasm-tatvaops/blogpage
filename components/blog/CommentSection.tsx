"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { mutate } from "swr";
import type { Comment } from "@/lib/services/comment.service";
import { useActivityPolling } from "@/lib/activityPolling";
import { getUserAvatar } from "@/lib/identityUI";
import { UserProfileQuickView } from "@/components/user/UserQuickView";
import { FollowButton } from "@/components/user/FollowButton";

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

const renderContentWithMentions = (text: string) =>
  text.split(/(@[a-zA-Z0-9._-]{2,32})/g).map((part, idx) => {
    if (/^@[a-zA-Z0-9._-]{2,32}$/.test(part)) {
      return (
        <Link
          key={`${part}-${idx}`}
          href={`/users?search=${encodeURIComponent(part.slice(1))}`}
          className="font-semibold text-sky-700 hover:underline"
        >
          {part}
        </Link>
      );
    }
    return <span key={`${part}-${idx}`}>{part}</span>;
  });

type MentionSuggestion = { username: string; displayName: string };
const mentionQueryFrom = (value: string): string | null => {
  const match = value.match(/(?:^|\s)@([a-zA-Z0-9._-]{0,32})$/);
  return match?.[1]?.toLowerCase() ?? null;
};

export function CommentSection({ slug, initialComments }: CommentSectionProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const commentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [authorName, setAuthorName] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (session?.user?.name) setAuthorName(session.user.name);
  }, [session]);
  const [sortMode, setSortMode] = useState<"top" | "newest">("newest");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyFor, setActiveReplyFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [votingCommentId, setVotingCommentId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [mentionTarget, setMentionTarget] = useState<{ type: "main" } | { type: "reply"; id: string } | null>(null);
  const currentIdentityKey = session?.user?.id ? `google:${session.user.id}` : null;
  const fallbackAuthorName = String(session?.user?.name ?? "").trim() || "Member";
  const getDisplayName = useCallback((comment: Comment) => {
    const username = String(comment.username ?? "").trim();
    if (username) return username;
    const author = String(comment.author_name ?? "").trim();
    if (author) return author;
    const identity = String(comment.identity_key ?? "").trim();
    return identity ? `user:${identity.slice(-6)}` : "User";
  }, []);

  const updateMentionSuggestions = useCallback(async (value: string, target: { type: "main" } | { type: "reply"; id: string }) => {
    const query = mentionQueryFrom(value);
    if (query === null) {
      setMentionSuggestions([]);
      setMentionTarget(null);
      return;
    }
    setMentionTarget(target);
    try {
      const response = await fetch(`/api/users/mentions?q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const payload = (await response.json()) as { suggestions?: MentionSuggestion[] };
      setMentionSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : []);
    } catch {
      setMentionSuggestions([]);
    }
  }, []);

  const applyMentionSuggestion = (username: string) => {
    const apply = (input: string): string => input.replace(/(?:^|\s)@[a-zA-Z0-9._-]{1,32}$/, ` @${username} `).replace(/\s{2,}/g, " ");
    if (!mentionTarget) return;
    if (mentionTarget.type === "main") {
      setContent((prev) => apply(prev));
    } else {
      const id = mentionTarget.id;
      setReplyDrafts((prev) => ({ ...prev, [id]: apply(prev[id] ?? "") }));
    }
    setMentionSuggestions([]);
    setMentionTarget(null);
  };

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

    const submitAuthor = authorName.trim() || (session ? fallbackAuthorName : "Anonymous");
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: submitAuthor, content: content.trim() }),
      });

      const json = (await res.json()) as { error?: string; comment?: Comment };
      if (!res.ok) throw new Error(json.error ?? "Failed to post comment.");

      if (json.comment) {
        setComments((prev) => [json.comment!, ...prev]);
      }
      void mutate("/api/me");
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
    const replyAuthor = authorName.trim() || (session ? fallbackAuthorName : "Anonymous");
    if (!replyText) return;
    if (submitting) return;

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/comments`, {
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
      void mutate("/api/me");

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
      void mutate("/api/me");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to vote.");
    } finally {
      setVotingCommentId(null);
    }
  };

  const onDelete = async (commentId: string) => {
    if (!currentIdentityKey || deletingCommentId) return;
    setDeletingCommentId(commentId);
    setError(null);
    try {
      const res = await fetch(
        `/api/blog/${encodeURIComponent(slug)}/comments/${encodeURIComponent(commentId)}`,
        { method: "DELETE" },
      );
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error ?? "Failed to delete comment.");

      setComments((prev) =>
        patchCommentTree(prev, commentId, (comment) => ({
          ...comment,
          author_name: "[deleted]",
          content: "[deleted]",
          is_deleted: true,
          upvote_count: 0,
          downvote_count: 0,
          score: 0,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete comment.");
    } finally {
      setDeletingCommentId(null);
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
          onClick={() => {
            commentTextareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            commentTextareaRef.current?.focus();
          }}
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

        {!session && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
            You are commenting as Anonymous.
          </p>
        )}

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
            placeholder="Your name (optional)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            maxLength={80}
            disabled={submitting}
            className={`${inputClass} disabled:opacity-50`}
          />
          <textarea
            ref={commentTextareaRef}
            placeholder="Share your thoughts or questions…"
            value={content}
            onChange={(e) => {
              const next = e.target.value;
              setContent(next);
              void updateMentionSuggestions(next, { type: "main" });
            }}
            maxLength={2000}
            rows={4}
            required
            disabled={submitting}
            className={`${inputClass} disabled:opacity-50`}
          />
          {mentionTarget?.type === "main" && mentionSuggestions.length > 0 && (
            <div className="rounded-lg border border-app bg-surface p-1">
              {mentionSuggestions.map((item) => (
                <button
                  key={item.username}
                  type="button"
                  onClick={() => applyMentionSuggestion(item.username)}
                  className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-subtle"
                >
                  <span className="font-medium text-app">@{item.username}</span>
                  <span className="text-xs text-muted">{item.displayName || "User"}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-400">{content.length}/2000</span>
          <button
            type="submit"
            disabled={submitting || !content.trim()}
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
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  {c.identity_key ? (
                    <Link
                      href={`/user/${encodeURIComponent(c.identity_key)}`}
                      className="text-sm font-semibold text-app hover:underline"
                    >
                      {getDisplayName(c)}
                    </Link>
                  ) : (
                    <span className="text-sm font-semibold text-app">{getDisplayName(c)}</span>
                  )}
                  {!c.is_deleted && c.identity_key && (
                            <UserProfileQuickView
                              displayName={getDisplayName(c)}
                      identityKey={c.identity_key}
                      trigger={
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          title="Quick view"
                          aria-label="Quick view"
                        >
                          👁
                        </span>
                      }
                    />
                  )}
                  <time className="text-xs text-slate-400" dateTime={c.created_at}>
                    {formatDate(c.created_at)}
                  </time>
                  {!c.is_deleted && c.identity_key && (
                    <FollowButton targetIdentityKey={c.identity_key} variant="compact" />
                  )}
                </div>
                {c.is_deleted ? (
                  <p className="mt-1 text-sm italic text-slate-400">[deleted]</p>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {renderContentWithMentions(c.content)}
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
                    {currentIdentityKey && c.identity_key === currentIdentityKey && (
                      <button
                        type="button"
                        disabled={deletingCommentId === c.id}
                        onClick={() => onDelete(c.id)}
                        className="rounded-md border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}

                {activeReplyFor === c.id && (
                  <div className="mt-3 rounded-lg border border-app bg-subtle p-3">
                    <textarea
                      value={replyDrafts[c.id] ?? ""}
                      onChange={(e) => {
                        const next = e.target.value;
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [c.id]: next,
                        }));
                        void updateMentionSuggestions(next, { type: "reply", id: c.id });
                      }}
                      rows={3}
                      maxLength={2000}
                      placeholder="Write a reply..."
                      className={inputClass}
                    />
                    {mentionTarget?.type === "reply" && mentionTarget.id === c.id && mentionSuggestions.length > 0 && (
                      <div className="mt-2 rounded-lg border border-app bg-surface p-1">
                        {mentionSuggestions.map((item) => (
                          <button
                            key={item.username}
                            type="button"
                            onClick={() => applyMentionSuggestion(item.username)}
                            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-subtle"
                          >
                            <span className="font-medium text-app">@{item.username}</span>
                            <span className="text-xs text-muted">{item.displayName || "User"}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={!(replyDrafts[c.id] ?? "").trim() || submitting}
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
                          {reply.identity_key ? (
                            <Link
                              href={`/user/${encodeURIComponent(reply.identity_key)}`}
                              className="text-sm font-semibold text-app hover:underline"
                            >
                              {getDisplayName(reply)}
                            </Link>
                          ) : (
                            <span className="text-sm font-semibold text-app">{getDisplayName(reply)}</span>
                          )}
                          {!reply.is_deleted && reply.identity_key && (
                            <UserProfileQuickView
                              displayName={getDisplayName(reply)}
                              identityKey={reply.identity_key}
                              trigger={
                                <span
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                  title="Quick view"
                                  aria-label="Quick view"
                                >
                                  👁
                                </span>
                              }
                            />
                          )}
                          <time className="text-xs text-slate-400" dateTime={reply.created_at}>
                            {formatDate(reply.created_at)}
                          </time>
                          {!reply.is_deleted && reply.identity_key && (
                            <FollowButton targetIdentityKey={reply.identity_key} variant="compact" />
                          )}
                        </div>
                        {reply.is_deleted ? (
                          <p className="mt-1 text-sm italic text-slate-400">[deleted]</p>
                        ) : (
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {renderContentWithMentions(reply.content)}
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
                            {currentIdentityKey && reply.identity_key === currentIdentityKey && (
                              <button
                                type="button"
                                disabled={deletingCommentId === reply.id}
                                onClick={() => onDelete(reply.id)}
                                className="rounded-md border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}

                        {activeReplyFor === reply.id && (
                          <div className="mt-3 rounded-lg border border-app bg-subtle p-3">
                            <textarea
                              value={replyDrafts[reply.id] ?? ""}
                              onChange={(e) => {
                                const next = e.target.value;
                                setReplyDrafts((prev) => ({
                                  ...prev,
                                  [reply.id]: next,
                                }));
                                void updateMentionSuggestions(next, { type: "reply", id: reply.id });
                              }}
                              rows={3}
                              maxLength={2000}
                              placeholder="Write a reply..."
                              className={inputClass}
                            />
                            {mentionTarget?.type === "reply" && mentionTarget.id === reply.id && mentionSuggestions.length > 0 && (
                              <div className="mt-2 rounded-lg border border-app bg-surface p-1">
                                {mentionSuggestions.map((item) => (
                                  <button
                                    key={item.username}
                                    type="button"
                                    onClick={() => applyMentionSuggestion(item.username)}
                                    className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-subtle"
                                  >
                                    <span className="font-medium text-app">@{item.username}</span>
                                    <span className="text-xs text-muted">{item.displayName || "User"}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 flex justify-end">
                              <button
                                type="button"
                                disabled={!(replyDrafts[reply.id] ?? "").trim() || submitting}
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
                                  {nested.identity_key ? (
                                    <Link
                                      href={`/user/${encodeURIComponent(nested.identity_key)}`}
                                      className="text-sm font-semibold text-app hover:underline"
                                    >
                                      {getDisplayName(nested)}
                                    </Link>
                                  ) : (
                                    <span className="text-sm font-semibold text-app">{getDisplayName(nested)}</span>
                                  )}
                                  {!nested.is_deleted && nested.identity_key && (
                                    <UserProfileQuickView
                                      displayName={getDisplayName(nested)}
                                      identityKey={nested.identity_key}
                                      trigger={
                                        <span
                                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                          title="Quick view"
                                          aria-label="Quick view"
                                        >
                                          👁
                                        </span>
                                      }
                                    />
                                  )}
                                  <time className="text-xs text-slate-400" dateTime={nested.created_at}>
                                    {formatDate(nested.created_at)}
                                  </time>
                                  {!nested.is_deleted && nested.identity_key && (
                                    <FollowButton targetIdentityKey={nested.identity_key} variant="compact" />
                                  )}
                                </div>
                                {nested.is_deleted ? (
                                  <p className="mt-1 text-sm italic text-slate-400">[deleted]</p>
                                ) : (
                                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                    {renderContentWithMentions(nested.content)}
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
                                    {currentIdentityKey && nested.identity_key === currentIdentityKey && (
                                      <button
                                        type="button"
                                        disabled={deletingCommentId === nested.id}
                                        onClick={() => onDelete(nested.id)}
                                        className="rounded-md border border-rose-200 px-2 py-1 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                      >
                                        Delete
                                      </button>
                                    )}
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
