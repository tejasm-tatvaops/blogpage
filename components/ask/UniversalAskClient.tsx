"use client";

import { useEffect, useMemo, useState } from "react";

type AskOption = {
  slug: string;
  title: string;
  tags: string[];
  category: string;
  sourceType: "blog" | "siteJournal" | "forum";
};

type AiMode =
  | "site_analyst"
  | "cost_strategist"
  | "planning_engineer"
  | "safety_auditor"
  | "debate_synthesizer";

const AI_MODES: Array<{ id: AiMode; label: string; hint: string }> = [
  { id: "site_analyst", label: "Site Analyst", hint: "Execution risks and operational pattern reading." },
  { id: "cost_strategist", label: "Cost Strategist", hint: "Budget drift, procurement pressure, and cost control." },
  { id: "planning_engineer", label: "Planning Engineer", hint: "Sequencing, timeline slippage, and coordination logic." },
  { id: "safety_auditor", label: "Safety Auditor", hint: "Hazard cues, exposure risks, and preventive controls." },
  { id: "debate_synthesizer", label: "Debate Synthesizer", hint: "Consensus, conflicts, and strongest arguments." },
];

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function UniversalAskClient({
  options,
  initialQuery = "",
  initialSlug = "",
  initialAiMode = "site_analyst",
  ecosystemContext,
}: {
  options: AskOption[];
  initialQuery?: string;
  initialSlug?: string;
  initialAiMode?: AiMode;
  ecosystemContext?: {
    currentPage?: string;
    currentSiteJournal?: string;
    timelineWeek?: string;
    city?: string;
    activeRisks?: string;
    tags?: string;
    relatedDiscussions?: string;
    contributorExpertise?: string;
    userIntent?: string;
  };
}) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedSlug, setSelectedSlug] = useState(initialSlug || options[0]?.slug || "");
  const [aiMode, setAiMode] = useState<AiMode>(initialAiMode);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docName, setDocName] = useState("");
  const [docExcerpt, setDocExcerpt] = useState("");
  const [listening, setListening] = useState(false);

  const selected = useMemo(
    () => options.find((item) => item.slug === selectedSlug) ?? options[0],
    [options, selectedSlug],
  );
  const originLine = useMemo(() => {
    if (!selected) return "";
    if (selected.sourceType === "siteJournal") {
      const week = ecosystemContext?.timelineWeek ? ` • ${ecosystemContext.timelineWeek}` : "";
      return `Analyzing site intelligence from ${selected.title}${week}`;
    }
    if (selected.sourceType === "forum") {
      return `Discussion intelligence from contractor thread: ${selected.title}`;
    }
    return `Analyzing implementation intelligence from article: ${selected.title}`;
  }, [ecosystemContext?.timelineWeek, selected]);

  useEffect(() => {
    if (!options.length) return;
    if (!selectedSlug || !options.some((item) => item.slug === selectedSlug)) {
      setSelectedSlug(options[0].slug);
    }
  }, [options, selectedSlug]);

  async function ask() {
    if (!query.trim() || !selected?.slug) return;
    setLoading(true);
    setError(null);
    setAnswer("");
    try {
      const targetSlug = selected.slug.startsWith("sj:")
        ? selected.slug.slice(3)
        : selected.slug.startsWith("fr:")
          ? selected.slug.slice(3)
          : selected.slug;
      const res = await fetch(`/api/blog/${targetSlug}/ask-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "ask",
          aiMode,
          question: query.trim(),
          anchorType: selected.sourceType,
          ecosystemContext,
          attachedContext: docExcerpt,
        }),
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

  const onAttachDocument = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const excerpt = text.trim().slice(0, 5000);
      if (!excerpt) {
        setError("Document appears empty or unreadable.");
        return;
      }
      setDocName(file.name);
      setDocExcerpt(excerpt);
    } catch {
      setError("Could not read document. Use a text-based file or paste extracted text.");
    }
  };

  const startVoice = () => {
    const SpeechRecognitionImpl =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      setError("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognitionImpl();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) {
        setQuery((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
      }
    };
    recognition.onerror = () => {
      setListening(false);
      setError("Voice capture failed. Please try again.");
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
      <aside className="rounded-2xl border border-app bg-surface p-4 shadow-sm">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Intelligence Context</h2>
        <p className="mt-1 text-sm text-muted">Choose the anchor and analytical lens. Ask AI stays grounded in that operational context.</p>

        <label className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Source anchor
          <select
            className="mt-1 w-full rounded-xl border border-app bg-white px-3 py-2.5 text-sm text-app outline-none focus:border-orange-300"
            value={selectedSlug}
            onChange={(event) => setSelectedSlug(event.target.value)}
          >
            {options.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.sourceType === "siteJournal" ? `Site Journal: ${item.title}` : item.sourceType === "forum" ? `Forum: ${item.title}` : item.title}
              </option>
            ))}
          </select>
        </label>

        {selected ? (
          <div className="mt-3 rounded-xl border border-app bg-subtle/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{selected.category}</p>
            <p className="mt-1 text-sm font-semibold text-app">{selected.title}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selected.tags.slice(0, 5).map((tag) => (
                <span key={tag} className="rounded-full border border-app bg-white px-2 py-0.5 text-[10px] text-muted">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">AI mode</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {AI_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setAiMode(mode.id)}
              className={
                aiMode === mode.id
                  ? "rounded-full border border-orange-300 bg-orange-50 px-2.5 py-1 text-[11px] text-orange-700"
                  : "rounded-full border border-app bg-white px-2.5 py-1 text-[11px] text-muted hover:border-orange-200 hover:text-app"
              }
            >
              {mode.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{AI_MODES.find((mode) => mode.id === aiMode)?.hint}</p>
      </aside>

      <section className="rounded-2xl border border-app bg-surface p-4 shadow-sm">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Ask Intelligence</h2>
        {originLine ? <p className="mt-1 text-xs text-muted">{originLine}.</p> : null}
        <div className="mt-3 flex gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask about execution, procurement, sequencing, cost, or risk..."
            className="w-full rounded-xl border border-app bg-white px-3 py-2.5 text-sm text-app outline-none focus:border-orange-300"
          />
          <button
            type="button"
            onClick={() => void ask()}
            disabled={loading || !query.trim()}
            className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Analyzing..." : "Ask"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <label className="inline-flex cursor-pointer items-center rounded-full border border-app bg-subtle px-3 py-1 text-muted hover:border-orange-200 hover:text-app">
            Attach document
            <input
              type="file"
              accept=".txt,.md,.csv,.json,.log"
              className="hidden"
              onChange={(event) => void onAttachDocument(event.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            onClick={startVoice}
            className="rounded-full border border-app bg-subtle px-3 py-1 text-muted hover:border-orange-200 hover:text-app"
          >
            {listening ? "Listening..." : "Voice input"}
          </button>
          {docName ? <span className="text-muted">Attached: {docName}</span> : null}
        </div>
        {docExcerpt ? (
          <p className="mt-2 rounded-lg border border-app/70 bg-subtle/40 px-3 py-2 text-xs text-muted">
            Document context added to this Ask request.
          </p>
        ) : null}

        <div className="mt-4 rounded-xl border border-app bg-subtle/40 p-4">
          {error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : answer ? (
            <p className="whitespace-pre-wrap text-sm leading-7 text-app/85">{answer}</p>
          ) : (
            <p className="text-sm text-muted">
              Responses are grounded with citations like <code>[S1]</code> and tuned by source context + selected AI mode.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

