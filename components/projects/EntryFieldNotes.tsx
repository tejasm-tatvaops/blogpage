"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type FieldNote = {
  id: string;
  identity_key: string | null;
  username?: string | null;
  expertise_badge?: string | null;
  profession?: string | null;
  expertise?: string | null;
  parent_comment_id: string | null;
  author_name: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  replies: FieldNote[];
};

type EntryFieldNotesProps = {
  slug: string;
  entryId: string;
  entryTitle: string;
  weekLabel: string;
  cityRegion: string;
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));

export function EntryFieldNotes({ slug, entryId, entryTitle, weekLabel, cityRegion }: EntryFieldNotesProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<FieldNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyFor, setActiveReplyFor] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentIdentityKey = session?.user?.id ? `google:${session.user.id}` : null;
  const fallbackAuthor = String(session?.user?.name ?? "").trim() || "Field Contributor";

  const loadNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/site-journals/${encodeURIComponent(slug)}/entries/${encodeURIComponent(entryId)}/field-notes`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as { notes?: FieldNote[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to load field notes.");
      setNotes(Array.isArray(payload.notes) ? payload.notes : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load field notes.");
    } finally {
      setLoading(false);
    }
  };

  const onToggleOpen = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next && notes.length === 0 && !loading) {
      await loadNotes();
    }
  };

  const onPost = async (parentId?: string) => {
    const text = parentId ? (replyDrafts[parentId] ?? "").trim() : content.trim();
    if (!text || posting) return;
    setPosting(true);
    setError(null);
    try {
      const response = await fetch(`/api/site-journals/${encodeURIComponent(slug)}/entries/${encodeURIComponent(entryId)}/field-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_name: fallbackAuthor,
          content: text,
          ...(parentId ? { parent_comment_id: parentId } : {}),
        }),
      });
      const payload = (await response.json()) as { note?: FieldNote; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to add field note.");
      await loadNotes();
      if (parentId) {
        setReplyDrafts((prev) => ({ ...prev, [parentId]: "" }));
        setActiveReplyFor(null);
      } else {
        setContent("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add field note.");
    } finally {
      setPosting(false);
    }
  };

  const onDelete = async (noteId: string) => {
    if (!currentIdentityKey || deletingId) return;
    setDeletingId(noteId);
    setError(null);
    try {
      const response = await fetch(
        `/api/site-journals/${encodeURIComponent(slug)}/entries/${encodeURIComponent(entryId)}/field-notes/${encodeURIComponent(noteId)}`,
        { method: "DELETE" },
      );
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Failed to delete field note.");
      await loadNotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete field note.");
    } finally {
      setDeletingId(null);
    }
  };

  const rootNotes = notes;
  const allMessages = useMemo(() => {
    const list: string[] = [];
    for (const root of rootNotes) {
      if (!root.is_deleted) list.push(root.content.toLowerCase());
      for (const reply of root.replies ?? []) {
        if (!reply.is_deleted) list.push(reply.content.toLowerCase());
      }
    }
    return list;
  }, [rootNotes]);

  const threadInsight = useMemo(() => {
    if (allMessages.length === 0) return null;
    const corpus = allMessages.join(" ");
    if (/\b(procurement|vendor|supplier|steel|cement|delivery|logistics)\b/.test(corpus)) {
      return "Recurring pattern detected: procurement and supplier dependency appear repeatedly in this thread.";
    }
    if (/\b(delay|slip|slippage|late|blocked|risk)\b/.test(corpus)) {
      return "Recurring pattern detected: timeline and delay pressure are recurring discussion anchors.";
    }
    if (/\b(labor|crew|manpower|workforce)\b/.test(corpus)) {
      return "Recurring pattern detected: labor coordination appears repeatedly in this week’s field notes.";
    }
    return "Discussion summary: contributors are sharing operational context and situational execution observations.";
  }, [allMessages]);

  const participantCount = useMemo(() => {
    const keys = new Set<string>();
    rootNotes.forEach((root) => {
      if (root.identity_key) keys.add(root.identity_key);
      root.replies.forEach((reply) => {
        if (reply.identity_key) keys.add(reply.identity_key);
      });
    });
    return keys.size;
  }, [rootNotes]);

  const askHref = useMemo(() => {
    const prompt = `Summarize and synthesize field notes for ${weekLabel} in ${entryTitle}. Highlight consensus, disagreements, recurring risks, and next operational action.`;
    const params = new URLSearchParams({
      prompt,
      anchor: `sj:${slug}`,
      sourceType: "siteJournal",
      aiMode: "debate_synthesizer",
      page: "site_journal_field_notes",
      intent: "Synthesize field note discussion",
      journal: entryTitle,
      week: weekLabel,
      city: cityRegion,
      discussions: `Field notes thread for ${weekLabel}`,
    });
    return `/ask?${params.toString()}`;
  }, [cityRegion, entryTitle, slug, weekLabel]);

  const inputClass =
    "w-full rounded-xl bg-white px-3 py-2 text-sm text-app outline-none ring-1 ring-slate-200/60 transition-[box-shadow,transform] duration-200 ease-out placeholder:text-muted focus:ring-2 focus:ring-orange-300/60";

  return (
    <div className="mt-4 rounded-2xl bg-subtle/25 p-3 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.22)] sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Field Notes</p>
          <p className="mt-1 text-xs text-muted">
            {rootNotes.length > 0 ? `${rootNotes.length} discussion notes` : "No notes yet"} • {participantCount} contributors
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleOpen}
          className="rounded-full bg-white px-3 py-1 text-xs text-app shadow-sm ring-1 ring-slate-200/60 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(15,23,42,0.06)]"
        >
          {isOpen ? "Hide Notes" : "Open Notes"}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-4 space-y-4">
          {threadInsight ? (
            <div className="rounded-xl bg-surface px-3 py-2 text-xs text-muted shadow-[0_10px_22px_rgba(15,23,42,0.045)] ring-1 ring-slate-200/60">
              <p>
                <span className="font-semibold text-app/85">Thread Insight:</span> {threadInsight}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Link
                  href={askHref}
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] text-muted shadow-sm ring-1 ring-slate-200/60 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:text-app hover:shadow-[0_10px_22px_rgba(15,23,42,0.06)]"
                >
                  Ask AI about this discussion
                </Link>
              </div>
            </div>
          ) : null}

          {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}

          <div className="rounded-xl bg-surface p-3 shadow-[0_10px_22px_rgba(15,23,42,0.045)] ring-1 ring-slate-200/60">
            <p className="text-xs font-medium text-app">Share an operational insight.</p>
            <textarea
              rows={3}
              maxLength={2000}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a field note... highlight what changed, why it matters, and what should happen next."
              className={`${inputClass} mt-2`}
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-[11px] text-muted">Insight notes, questions, and similar site experience only.</p>
              <button
                type="button"
                disabled={posting || !content.trim()}
                onClick={() => void onPost()}
                className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold !text-white shadow-sm transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-[0_12px_26px_rgba(251,146,60,0.24)] disabled:opacity-50"
              >
                {posting ? "Saving..." : "Add Field Note"}
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-xs text-muted">Loading field notes...</p>
          ) : rootNotes.length === 0 ? (
            <p className="rounded-xl bg-white/70 p-4 text-sm text-muted shadow-[inset_0_0_0_1px_rgba(148,163,184,0.28)]">
              No field notes yet. Add the first operational context for this weekly entry.
            </p>
          ) : (
            <div className="space-y-3">
              {rootNotes.map((note) => {
                const displayName = String(note.username ?? "").trim() || note.author_name || "Contributor";
                const canDelete = Boolean(currentIdentityKey && note.identity_key && note.identity_key === currentIdentityKey && !note.is_deleted);
                const isExpertPerspective = Boolean(note.expertise_badge || note.profession || note.expertise);
                return (
                  <article key={note.id} className="rounded-xl bg-surface p-3 shadow-[0_10px_22px_rgba(15,23,42,0.045)] ring-1 ring-slate-200/60">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span className="font-semibold text-app">{displayName}</span>
                      {isExpertPerspective ? (
                          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.35)]">
                          Expert Perspective
                        </span>
                      ) : null}
                      {note.profession ? <span className="rounded-full bg-white px-2 py-0.5 shadow-sm ring-1 ring-slate-200/55">{note.profession}</span> : null}
                      {note.expertise_badge ? <span className="rounded-full bg-white px-2 py-0.5 shadow-sm ring-1 ring-slate-200/55">{note.expertise_badge}</span> : null}
                      <span>{formatDate(note.created_at)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-app/90">{note.is_deleted ? "[deleted]" : note.content}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {!note.is_deleted ? (
                        <button
                          type="button"
                          onClick={() => setActiveReplyFor((prev) => (prev === note.id ? null : note.id))}
                          className="rounded-md bg-white px-2 py-1 text-muted shadow-sm ring-1 ring-slate-200/55 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:text-app"
                        >
                          Reply
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          disabled={deletingId === note.id}
                          onClick={() => void onDelete(note.id)}
                          className="rounded-md bg-rose-50 px-2 py-1 text-rose-700 shadow-[inset_0_0_0_1px_rgba(251,113,133,0.25)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>

                    {activeReplyFor === note.id ? (
                      <div className="mt-3 rounded-lg bg-subtle p-3 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.24)]">
                        <textarea
                          rows={2}
                          maxLength={2000}
                          value={replyDrafts[note.id] ?? ""}
                          onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [note.id]: e.target.value }))}
                          placeholder="Contribute context..."
                          className={inputClass}
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            disabled={posting || !(replyDrafts[note.id] ?? "").trim()}
                            onClick={() => void onPost(note.id)}
                            className="rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-semibold !text-white shadow-sm transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-[0_12px_26px_rgba(251,146,60,0.24)] disabled:opacity-50"
                          >
                            {posting ? "Saving..." : "Post Reply"}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {note.replies.length > 0 ? (
                      <div className="mt-3 space-y-2 border-l border-slate-300/80 pl-3">
                        {note.replies.map((reply) => {
                          const replyName = String(reply.username ?? "").trim() || reply.author_name || "Contributor";
                          return (
                            <div key={reply.id} className="rounded-lg bg-subtle/40 p-2.5 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.24)]">
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                                <span className="font-semibold text-app">{replyName}</span>
                                {reply.profession ? <span>{reply.profession}</span> : null}
                                <span>{formatDate(reply.created_at)}</span>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-app/85">{reply.is_deleted ? "[deleted]" : reply.content}</p>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
