"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log structured error info. Replace with Sentry.captureException(error) when integrated.
    console.error({
      message: error.message,
      digest: error.digest,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-20">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900">Something went wrong</h2>
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
