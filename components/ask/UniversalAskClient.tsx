"use client";

import { useMemo, useState } from "react";

type AskOption = {
  slug: string;
  title: string;
  tags: string[];
  category: string;
};

export function UniversalAskClient({ options }: { options: AskOption[] }) {
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(options[0]?.slug ?? "");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => options.find((item) => item.slug === selectedSlug) ?? options[0],
    [options, selectedSlug],
  );

  async function ask() {
    if (!query.trim() || !selected?.slug) return;
    setLoading(true);
    setError(null);
    setAnswer("");
    try {
      const res = await fetch(`/api/blog/${selected.slug}/ask-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "ask", question: query.trim() }),
      });
      if (!res.ok || !res.body) throw new Error("Ask AI is unavailable right now.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const raw of chunks) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as { token?: string };
            if (parsed.token) setAnswer((prev) => prev + parsed.token);
          } catch {
            // Ignore malformed chunks.
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
      <aside className="rounded-2xl border border-app bg-surface p-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Knowledge anchor</h2>
        <p className="mt-1 text-sm text-slate-600">
          Pick a topic anchor. AI will use platform knowledge graph retrieval from that context.
        </p>
        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Article context
          <select
            className="mt-1 w-full rounded-lg border border-app bg-subtle px-3 py-2 text-sm text-app"
            value={selectedSlug}
            onChange={(event) => setSelectedSlug(event.target.value)}
          >
            {options.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <div className="mt-3 rounded-lg border border-app bg-subtle p-3">
            <p className="text-xs font-semibold text-slate-500">{selected.category}</p>
            <p className="mt-1 text-sm font-semibold text-app">{selected.title}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {selected.tags.slice(0, 4).map((tag) => (
                <span key={tag} className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>

      <section className="rounded-2xl border border-app bg-surface p-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Ask AI</h2>
        <div className="mt-2 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask about costs, BOQ, sequencing, materials, or risks..."
            className="w-full rounded-lg border border-app bg-subtle px-3 py-2 text-sm text-app"
          />
          <button
            type="button"
            onClick={() => void ask()}
            disabled={loading || !query.trim()}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Thinking..." : "Ask"}
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-app bg-subtle p-4">
          {error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : answer ? (
            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{answer}</p>
          ) : (
            <p className="text-sm text-slate-500">
              Answers include platform-grounded citations like <code>[S1]</code> and confidence indicators.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

