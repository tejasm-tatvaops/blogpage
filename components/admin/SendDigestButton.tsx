"use client";

import { useState } from "react";

type DigestResult = {
  recipients: number;
  postsIncluded: number;
  sent: number;
  failed: number;
};

export default function SendDigestButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DigestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/newsletter/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const payload = (await response.json()) as DigestResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Failed to send digest.");

      setResult({
        recipients: payload.recipients,
        postsIncluded: payload.postsIncluded,
        sent: payload.sent,
        failed: payload.failed,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send digest.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSend}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold !text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Sending digest..." : "Send newsletter digest"}
      </button>
      {result && (
        <p className="text-xs text-emerald-700">
          Sent {result.sent}/{result.recipients} emails ({result.failed} failed), with {result.postsIncluded} posts.
        </p>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
