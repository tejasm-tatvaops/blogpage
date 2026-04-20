"use client";

import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (status === "loading") return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { message?: string; error?: string };

      if (res.ok) {
        setStatus("success");
        setMessage(json.message ?? "Subscribed!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(json.error ?? "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-6">
      <div className="mb-1 flex items-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-sky-500"
          aria-hidden
        >
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <p className="text-sm font-bold text-app">Stay in the loop</p>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-slate-500">
        Get the latest construction cost insights and estimation guides straight to your inbox.
        No spam, unsubscribe anytime.
      </p>

      {status === "success" ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {message}
        </div>
      ) : (
        <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={status === "loading"}
            className="flex-1 rounded-xl border border-app bg-surface px-3 py-2 text-sm outline-none ring-sky-400 transition placeholder:text-slate-400 focus:ring-2 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={status === "loading" || !email}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold !text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
          >
            {status === "loading" ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="mt-2 text-xs text-red-600">{message}</p>
      )}
    </div>
  );
}
