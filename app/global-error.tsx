"use client";

import { useEffect } from "react";

type GlobalErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({ error, reset }: GlobalErrorPageProps) {
  useEffect(() => {
    // Log structured error info. Replace with Sentry.captureException(error) when integrated.
    console.error({
      message: error.message,
      digest: error.digest,
      stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
          <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">Unexpected application error</h1>
            <p className="mt-2 text-sm text-slate-700">
              Please retry the action. If the issue continues, restart the server and try again.
            </p>
            {error.digest && (
              <p className="mt-3 font-mono text-xs text-slate-500">Ref: {error.digest}</p>
            )}
            <button
              type="button"
              onClick={reset}
              className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold !text-white transition hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
