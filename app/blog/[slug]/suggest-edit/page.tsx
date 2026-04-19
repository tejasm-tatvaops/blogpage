"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function SuggestEditPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug ?? "";

  const [displayName, setDisplayName]     = useState("");
  const [editSummary, setEditSummary]     = useState("");
  const [proposedContent, setProposedContent] = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [success, setSuccess]             = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/blog/${encodeURIComponent(slug)}/suggest-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposed_content: proposedContent,
          edit_summary: editSummary,
          display_name: displayName,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to submit.");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push(`/blog/${slug}`), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="text-3xl">✓</div>
        <h2 className="mt-4 text-xl font-semibold text-slate-800">Edit Submitted</h2>
        <p className="mt-2 text-slate-500">
          Your suggestion is now in the review queue. Expert reviewers will evaluate it shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <a href={`/blog/${slug}`} className="text-sm text-sky-600 hover:underline">
          ← Back to article
        </a>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Suggest an Edit</h1>
        <p className="mt-2 text-sm text-slate-500">
          Propose improvements to this article. A peer reviewer (Expert tier or above) will evaluate
          your suggestion before it goes live.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Your name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={120}
            placeholder="Display name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Edit summary{" "}
            <span className="text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={editSummary}
            onChange={(e) => setEditSummary(e.target.value)}
            maxLength={300}
            placeholder="Briefly describe what you changed and why"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Proposed content <span className="text-red-500">*</span>
          </label>
          <p className="mb-2 text-xs text-slate-400">
            Paste the full revised article content (Markdown). Your version will be diff-compared
            against the current live version.
          </p>
          <textarea
            value={proposedContent}
            onChange={(e) => setProposedContent(e.target.value)}
            required
            minLength={50}
            rows={20}
            placeholder="# Article Title&#10;&#10;Your revised content here..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !proposedContent.trim() || !displayName.trim()}
          className="w-full rounded-xl bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit for Review"}
        </button>
      </form>
    </div>
  );
}
