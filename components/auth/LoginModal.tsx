"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function LoginModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const applyTimeTheme = () => {
      const hour = new Date().getHours();
      setIsNight(hour >= 19 || hour < 6);
    };
    applyTimeTheme();
    const timer = window.setInterval(applyTimeTheme, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  const handleGoogle = async () => {
    setLoading(true);
    await signIn("google");
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm ${
        isNight ? "bg-black/60" : "bg-slate-950/45"
      }`}
    >
      <div className={`relative w-full max-w-md overflow-hidden rounded-3xl p-8 shadow-2xl ${
        isNight
          ? "border border-sky-400/20 bg-[#0b1220]"
          : "border border-sky-300/35 bg-white"
      }`}>
        <div className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full blur-2xl ${
          isNight ? "bg-sky-400/20" : "bg-sky-400/15"
        }`} />
        <div className={`pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full blur-2xl ${
          isNight ? "bg-indigo-500/20" : "bg-indigo-500/15"
        }`} />
        <button
          type="button"
          onClick={onClose}
          className={`absolute right-4 top-4 rounded-lg p-1 text-slate-400 transition ${
            isNight ? "hover:text-slate-200" : "hover:text-slate-600"
          }`}
          aria-label="Close login modal"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="relative">
          <span className={`mb-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            isNight
              ? "border-sky-300/30 bg-sky-400/15 text-sky-200"
              : "border-sky-300/40 bg-sky-100 text-sky-700"
          }`}>
            Unlock full experience
          </span>
          <h2 className={`mb-1 text-3xl font-extrabold leading-tight ${isNight ? "text-white" : "text-slate-900"}`}>Continue with TatvaOps</h2>
          <p className={`mb-6 text-sm ${isNight ? "text-slate-300" : "text-slate-600"}`}>
            Save articles, earn reputation points, get personalized feed, and join higher-quality discussions.
          </p>
        </div>

        <div className={`mb-6 grid grid-cols-1 gap-2 rounded-2xl border p-3 text-xs ${
          isNight
            ? "border-white/10 bg-white/5 text-slate-200"
            : "border-slate-200 bg-slate-50 text-slate-700"
        }`}>
          <p>• Save and resume reading across devices</p>
          <p>• Build reputation with comments and contributions</p>
          <p>• Get smarter recommendations tuned to your interests</p>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className={`relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl border px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60 ${
            isNight
              ? "border-sky-300/40 bg-sky-500/20 hover:border-sky-300/60 hover:bg-sky-500/30"
              : "border-sky-300 bg-sky-600 hover:border-sky-500 hover:bg-sky-700"
          }`}
        >
          {loading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          )}
          {loading ? "Redirecting…" : "Continue with Google"}
        </button>

        <p className={`mt-5 text-center text-xs ${isNight ? "text-slate-400" : "text-slate-500"}`}>
          Takes 1 click. No password needed.
        </p>
      </div>
    </div>
  );
}
