"use client";

import { useState, useRef, useCallback } from "react";

type Mode = "ask" | "summarize" | "eli5";

type AiAssistantProps = { slug: string };

export function AiAssistant({ slug }: AiAssistantProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("ask");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(
    async (selectedMode: Mode = mode) => {
      if (loading) return;
      if (selectedMode === "ask" && !question.trim()) return;

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true);
      setAnswer("");
      setError("");

      try {
        const res = await fetch(`/api/blog/${slug}/ask-ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: selectedMode, question }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Request failed.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") break;
            try {
              const { token } = JSON.parse(payload) as { token?: string };
              if (token) setAnswer((prev) => prev + token);
            } catch {
              // ignore
            }
          }
        }
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== "AbortError") {
          setError((err as Error).message ?? "Something went wrong.");
        }
      } finally {
        setLoading(false);
      }
    },
    [slug, mode, question, loading],
  );

  const quickAction = (m: Mode) => {
    setMode(m);
    setQuestion("");
    submit(m);
  };

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 via-white to-sky-50/40">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-indigo-50/60"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-app">Ask AI about this article</p>
          <p className="text-[11px] text-slate-500">Summaries, explanations, Q&amp;A — powered by AI</p>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-indigo-100 px-5 pb-5 pt-4">
          {/* Quick actions */}
          <div className="mb-4 flex flex-wrap gap-2">
            {(["summarize", "eli5"] as const).map((m) => (
              <button
                key={m}
                onClick={() => quickAction(m)}
                disabled={loading}
                className="rounded-lg border border-indigo-200 bg-surface px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50"
              >
                {m === "summarize" ? "Summarize article" : "Explain simply (ELI5)"}
              </button>
            ))}
          </div>

          {/* Ask input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit("ask")}
              placeholder="Ask a question about this article…"
              maxLength={500}
              className="min-w-0 flex-1 rounded-xl border border-app bg-surface px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              onClick={() => submit("ask")}
              disabled={loading || !question.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : (
                "Ask"
              )}
            </button>
          </div>

          {/* Answer */}
          {(answer || loading) && (
            <div className="mt-4 rounded-xl border border-indigo-100 bg-surface p-4">
              {answer ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                  {answer}
                  {loading && <span className="ml-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-indigo-500 align-middle" />}
                </p>
              ) : (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Thinking…
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
