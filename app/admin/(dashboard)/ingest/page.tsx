"use client";

import { useState } from "react";

type OutputType = "blog" | "forum" | "short_caption" | "tutorial";
type Tab = "url" | "paste";

type JobResult = {
  job_id: string;
  status: string;
};

type JobDetail = {
  _id: string;
  status: string;
  ai_title?: string;
  ai_summary?: string;
  ai_insights?: string[];
  ai_content?: string;
  ai_tags?: string[];
  ai_category?: string;
  output_type?: string;
  error_message?: string;
};

export default function IngestPage() {
  const [tab, setTab]           = useState<Tab>("url");
  const [url, setUrl]           = useState("");
  const [pastedText, setPastedText] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("blog");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [job, setJob]           = useState<JobResult | null>(null);
  const [jobDetail, setJobDetail] = useState<JobDetail | null>(null);
  const [polling, setPolling]   = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setJob(null);
    setJobDetail(null);
    setPublishResult(null);

    try {
      let res: Response;
      if (tab === "url") {
        res = await fetch("/api/ingest/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, output_type: outputType }),
        });
      } else {
        res = await fetch("/api/ingest/document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extracted_text: pastedText,
            source_type: "paste",
            output_type: outputType,
          }),
        });
      }

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Submission failed.");
        return;
      }

      const data = (await res.json()) as JobResult;
      setJob(data);
      void pollJob(data.job_id);
    } finally {
      setSubmitting(false);
    }
  };

  const pollJob = async (jobId: string) => {
    setPolling(true);
    let attempts = 0;
    const MAX_ATTEMPTS = 30;

    const check = async () => {
      if (attempts >= MAX_ATTEMPTS) {
        setPolling(false);
        setError("Timed out waiting for AI processing.");
        return;
      }
      attempts++;

      try {
        const res = await fetch(`/api/ingest/${jobId}`);
        const data = (await res.json()) as { job?: JobDetail };
        const detail = data.job;
        if (!detail) return;

        setJobDetail(detail);

        if (detail.status === "ready" || detail.status === "published" || detail.status === "failed") {
          setPolling(false);
          return;
        }

        setTimeout(check, 3_000);
      } catch {
        setTimeout(check, 3_000);
      }
    };

    setTimeout(check, 2_000);
  };

  const handlePublish = async () => {
    if (!job) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/ingest/${job.job_id}/publish`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; published_slug?: string; type?: string };
      if (data.ok) {
        setPublishResult(`Published as ${data.type}: /${data.type === "forum" ? "forums" : "blog"}/${data.published_slug}`);
        void pollJob(job.job_id);
      } else {
        setError("Publish failed.");
      }
    } finally {
      setPublishing(false);
    }
  };

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t-lg transition ${
      tab === t
        ? "bg-surface border border-b-white text-slate-800 -mb-px z-10 relative"
        : "text-slate-500 hover:text-slate-700"
    }`;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-app">AI Content Ingestion</h1>
        <p className="mt-1 text-sm text-slate-500">
          Feed a URL or paste text — the AI will extract insights and draft content for you.
        </p>
      </div>

      {/* Output type selector */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-medium text-slate-700">Generate as</label>
        <div className="flex flex-wrap gap-2">
          {(["blog", "forum", "short_caption", "tutorial"] as OutputType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setOutputType(t)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                outputType === t
                  ? "border-sky-400 bg-sky-50 text-sky-700"
                  : "border-app bg-surface text-slate-600 hover:border-slate-300"
              }`}
            >
              {t === "short_caption" ? "Short Caption" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-app mb-0">
        <button type="button" onClick={() => setTab("url")} className={tabClass("url")}>URL</button>
        <button type="button" onClick={() => setTab("paste")} className={tabClass("paste")}>Paste / Document</button>
      </div>

      <div className="rounded-b-xl rounded-tr-xl border border-app bg-surface p-5">
        {tab === "url" ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Article or webpage URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Paste extracted text (from PDF, DOC, or any source)
            </label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              rows={10}
              placeholder="Paste the content here…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (tab === "url" ? !url.trim() : pastedText.trim().length < 50)}
          className="mt-4 w-full rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Generate with AI"}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Status + preview */}
      {(job || polling) && (
        <div className="mt-6 rounded-xl border border-app bg-surface">
          <div className="border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2">
              {polling && (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
              )}
              <span className="text-sm font-medium text-slate-700">
                Status:{" "}
                <span className={`font-semibold ${
                  jobDetail?.status === "ready" ? "text-emerald-600" :
                  jobDetail?.status === "failed" ? "text-red-600" :
                  "text-amber-600"
                }`}>
                  {jobDetail?.status ?? "pending"}
                </span>
              </span>
            </div>
          </div>

          {jobDetail?.status === "failed" && (
            <div className="px-5 py-4 text-sm text-red-600">
              Error: {jobDetail.error_message ?? "Unknown error"}
            </div>
          )}

          {jobDetail?.status === "ready" && (
            <div className="px-5 py-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">AI Title</p>
                <p className="mt-1 text-base font-medium text-app">{jobDetail.ai_title}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Summary</p>
                <p className="mt-1 text-sm text-slate-600">{jobDetail.ai_summary}</p>
              </div>
              {jobDetail.ai_insights && jobDetail.ai_insights.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Key Insights</p>
                  <ul className="mt-1 space-y-1">
                    {jobDetail.ai_insights.map((ins, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-600">
                        <span className="mt-0.5 text-sky-400">•</span> {ins}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {(jobDetail.ai_tags ?? []).map((tag) => (
                  <span key={tag} className="rounded-full border border-app bg-subtle px-2.5 py-0.5 text-xs text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>

              {publishResult ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {publishResult}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing}
                  className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {publishing ? "Publishing…" : `Publish as ${jobDetail.output_type ?? "blog"} (draft)`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
