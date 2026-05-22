"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { StoryType } from "@/models/Story";

const BG_OPTIONS = [
  { id: "gradient-slate", label: "Slate", class: "from-slate-800 to-slate-950" },
  { id: "gradient-blue", label: "Blue", class: "from-blue-800 to-slate-950" },
  { id: "gradient-amber", label: "Amber", class: "from-amber-700 to-stone-950" },
  { id: "gradient-emerald", label: "Green", class: "from-emerald-800 to-slate-950" },
  { id: "gradient-purple", label: "Purple", class: "from-purple-800 to-indigo-950" },
  { id: "gradient-orange", label: "Orange", class: "from-orange-800 to-zinc-950" },
];

export type ComposePayload = {
  story_type: StoryType;
  text?: string;
  background_style?: string;
  tags?: string[];
  poll_question?: string;
  poll_options?: { text: string }[];
  linked_blog_slug?: string;
  linked_forum_slug?: string;
  topic_category?: string;
  location?: string;
  media_url?: string;
  media_type?: "image" | "video";
  ai_caption?: string;
  ai_hashtags?: string[];
};

type Props = {
  onSubmit: (payload: ComposePayload) => Promise<void>;
  onClose: () => void;
};

export function StoryComposer({ onSubmit, onClose }: Props) {
  const [tab, setTab] = useState<"text" | "poll" | "link">("text");
  const [text, setText] = useState("");
  const [bgStyle, setBgStyle] = useState("gradient-slate");
  const [tagsRaw, setTagsRaw] = useState("");
  const [location, setLocation] = useState("");
  const [linkedBlog, setLinkedBlog] = useState("");
  const [linkedForum, setLinkedForum] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [captionLoading, setCaptionLoading] = useState(false);
  const [aiCaption, setAiCaption] = useState<string | null>(null);
  const [aiHashtags, setAiHashtags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const generateCaption = async () => {
    setCaptionLoading(true);
    try {
      const res = await globalThis.fetch("/api/stories/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_type: tab,
          text: text || pollQuestion || undefined,
          tags: tags.length > 0 ? tags : undefined,
          location: location || undefined,
          linked_blog_slug: linkedBlog || undefined,
          linked_forum_slug: linkedForum || undefined,
        }),
      });
      if (!res.ok) throw new Error("Caption generation failed");
      const json = (await res.json()) as {
        caption: string;
        hashtags: string[];
        suggested_text?: string;
      };
      setAiCaption(json.caption);
      setAiHashtags(json.hashtags);
      if (json.suggested_text && !text.trim()) {
        setText(json.suggested_text);
      }
    } catch {
      setError("AI caption failed. Try again.");
    } finally {
      setCaptionLoading(false);
    }
  };

  const bg = BG_OPTIONS.find((b) => b.id === bgStyle) ?? BG_OPTIONS[0]!;
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter(Boolean)
    .slice(0, 10);

  const handleSubmit = async () => {
    setError(null);
    if (tab === "text" && !text.trim()) {
      setError("Please write something.");
      return;
    }
    if (tab === "poll") {
      if (!pollQuestion.trim()) { setError("Poll question required."); return; }
      const validOpts = pollOptions.filter((o) => o.trim());
      if (validOpts.length < 2) { setError("At least 2 poll options required."); return; }
    }

    setSubmitting(true);
    try {
      const payload: ComposePayload = {
        story_type: tab,
        background_style: bgStyle,
        tags,
        location: location.trim() || undefined,
        linked_blog_slug: linkedBlog.trim() || undefined,
        linked_forum_slug: linkedForum.trim() || undefined,
        ai_caption: aiCaption ?? undefined,
        ai_hashtags: aiHashtags.length > 0 ? aiHashtags : undefined,
      };

      if (tab === "text") {
        payload.text = text.trim();
      } else if (tab === "poll") {
        payload.poll_question = pollQuestion.trim();
        payload.poll_options = pollOptions
          .filter((o) => o.trim())
          .map((o) => ({ text: o.trim() }));
      }

      await onSubmit(payload);
    } catch {
      setError("Failed to post story. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Preview pane */}
      <div
        className={`relative flex h-48 items-center justify-center rounded-2xl bg-gradient-to-br ${bg.class} overflow-hidden mb-4`}
      >
        {tab === "text" && (
          <p className="px-6 text-center text-lg font-bold text-white leading-snug">
            {text || "Your story preview…"}
          </p>
        )}
        {tab === "poll" && (
          <p className="px-6 text-center text-lg font-bold text-white">
            {pollQuestion || "Poll question preview…"}
          </p>
        )}
        {tab === "link" && (
          <div className="px-6 text-center">
            <p className="text-white/60 text-sm">Linked content story</p>
            {(linkedBlog || linkedForum) && (
              <p className="mt-1 text-white text-sm font-semibold truncate">
                {linkedBlog || linkedForum}
              </p>
            )}
          </div>
        )}

        {/* AI caption overlay on preview */}
        {aiCaption && (
          <div className="absolute inset-x-0 bottom-0 bg-black/50 px-3 py-2 backdrop-blur-sm">
            <p className="text-center text-xs font-medium text-white/90 line-clamp-2">{aiCaption}</p>
          </div>
        )}
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 mb-4 rounded-xl bg-surface/10 p-1">
        {(["text", "poll", "link"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition ${
              tab === t
                ? "bg-surface text-app shadow"
                : "text-app/60 hover:text-app"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {/* Text tab */}
        {tab === "text" && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share a site update, tip, or observation…"
            maxLength={500}
            rows={4}
            className="w-full resize-none rounded-xl bg-surface/10 px-4 py-3 text-sm text-app outline-none placeholder-app/40 focus:bg-surface/15"
          />
        )}

        {/* Poll tab */}
        {tab === "poll" && (
          <div className="space-y-2">
            <input
              type="text"
              value={pollQuestion}
              onChange={(e) => setPollQuestion(e.target.value)}
              placeholder="Ask your question…"
              maxLength={200}
              className="w-full rounded-xl bg-surface/10 px-4 py-2.5 text-sm text-app outline-none placeholder-app/40 focus:bg-surface/15"
            />
            {pollOptions.map((opt, i) => (
              <input
                key={i}
                type="text"
                value={opt}
                onChange={(e) =>
                  setPollOptions((prev) =>
                    prev.map((o, idx) => (idx === i ? e.target.value : o)),
                  )
                }
                placeholder={`Option ${i + 1}`}
                maxLength={120}
                className="w-full rounded-xl bg-surface/10 px-4 py-2.5 text-sm text-app outline-none placeholder-app/40 focus:bg-surface/15"
              />
            ))}
            {pollOptions.length < 4 && (
              <button
                type="button"
                onClick={() => setPollOptions((p) => [...p, ""])}
                className="text-sm text-blue-500 hover:underline"
              >
                + Add option
              </button>
            )}
          </div>
        )}

        {/* Link tab */}
        {tab === "link" && (
          <div className="space-y-2">
            <input
              type="text"
              value={linkedBlog}
              onChange={(e) => setLinkedBlog(e.target.value)}
              placeholder="Blog slug (e.g. waterproofing-guide)"
              maxLength={200}
              className="w-full rounded-xl bg-surface/10 px-4 py-2.5 text-sm text-app outline-none placeholder-app/40 focus:bg-surface/15"
            />
            <input
              type="text"
              value={linkedForum}
              onChange={(e) => setLinkedForum(e.target.value)}
              placeholder="Forum slug (optional)"
              maxLength={200}
              className="w-full rounded-xl bg-surface/10 px-4 py-2.5 text-sm text-app outline-none placeholder-app/40 focus:bg-surface/15"
            />
          </div>
        )}

        {/* Background picker (text + poll) */}
        {tab !== "link" && (
          <div>
            <p className="mb-2 text-xs font-medium text-app/60">Background</p>
            <div className="flex gap-2 flex-wrap">
              {BG_OPTIONS.map((bg) => (
                <button
                  key={bg.id}
                  type="button"
                  onClick={() => setBgStyle(bg.id)}
                  className={`h-7 w-7 rounded-full bg-gradient-to-br ${bg.class} ring-2 transition ${
                    bgStyle === bg.id ? "ring-blue-400 ring-offset-1" : "ring-transparent"
                  }`}
                  title={bg.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tags + location */}
        <input
          type="text"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="Tags: concrete, waterproofing, boq…"
          className="w-full rounded-xl bg-surface/10 px-4 py-2.5 text-sm text-app outline-none placeholder-app/40 focus:bg-surface/15"
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (optional)"
          maxLength={120}
          className="w-full rounded-xl bg-surface/10 px-4 py-2.5 text-sm text-app outline-none placeholder-app/40 focus:bg-surface/15"
        />

        {/* AI caption result */}
        {(aiCaption || aiHashtags.length > 0) && (
          <div className="rounded-xl border border-app bg-subtle p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">AI Caption</span>
              <button
                type="button"
                onClick={() => { setAiCaption(null); setAiHashtags([]); }}
                className="ml-auto text-[10px] text-muted hover:text-app"
              >
                Clear
              </button>
            </div>
            {aiCaption && (
              <p className="text-sm text-app">{aiCaption}</p>
            )}
            {aiHashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {aiHashtags.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setTagsRaw((prev) => {
                      const existing = prev.split(",").map((t) => t.trim()).filter(Boolean);
                      if (!existing.includes(h)) return [...existing, h].join(", ");
                      return prev;
                    })}
                    className="rounded-full bg-info-soft px-2.5 py-1 text-[11px] font-semibold text-info-soft transition hover:opacity-80"
                  >
                    #{h}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI generate caption button */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => void generateCaption()}
          disabled={captionLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-app bg-subtle py-2.5 text-sm font-semibold text-muted transition hover:bg-surface/20 disabled:opacity-60"
        >
          {captionLoading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2Z"/>
              </svg>
              Generate AI Caption
            </>
          )}
        </motion.button>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-surface/10">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-surface/20 py-3 text-sm font-semibold text-app/70 transition hover:bg-surface/10"
        >
          Cancel
        </button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="flex-1 rounded-xl bg-blue-500 py-3 text-sm font-bold text-white transition hover:bg-blue-400 disabled:opacity-60"
        >
          {submitting ? "Posting…" : "Share Story"}
        </motion.button>
      </div>
    </div>
  );
}
