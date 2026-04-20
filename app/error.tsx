"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Avoid noisy empty-object logs in browser console.
    // Keep detailed logging only in development.
    if (process.env.NODE_ENV !== "development") return;

    const message = typeof error?.message === "string" && error.message.trim()
      ? error.message
      : "Unhandled client error";
    const digest = typeof error?.digest === "string" && error.digest.trim() ? error.digest : undefined;
    const stack = typeof error?.stack === "string" && error.stack.trim() ? error.stack : undefined;

    console.error("[app-error]", { message, digest, stack });
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-20">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h2 className="text-2xl font-bold text-app">Something went wrong</h2>
        <p className="mt-2 text-sm text-slate-700">
          We hit an unexpected error while loading this page. Please try again.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-slate-500">Ref: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-slate-700"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
