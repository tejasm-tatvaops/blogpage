"use client";

import { useState } from "react";
import { brandCertifications } from "@/data/brandProfileMock";

export default function Certifications() {
  const [viewed, setViewed] = useState<Set<string>>(new Set());

  const handleView = (label: string) =>
    setViewed((prev) => new Set(prev).add(label));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Certifications &amp; Approvals
      </h2>
      <p className="mt-0.5 text-xs text-slate-400">
        Industry-standard certifications and government authorisations
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {brandCertifications.map((cert) => (
          <div
            key={cert.label}
            className="flex flex-col items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-5 text-center transition hover:border-sky-200 hover:bg-sky-50/40 dark:border-slate-700/40 dark:bg-slate-800/40 dark:hover:border-sky-700/40"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-100 bg-sky-50 text-xl dark:border-sky-700/30 dark:bg-sky-900/20">
              {cert.icon}
            </span>
            <div>
              <p className="text-[11px] font-bold leading-snug text-slate-800 dark:text-slate-200">
                {cert.label}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">{cert.issuer}</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                ✓ Verified
              </span>
              <span className="text-[9px] text-slate-400">Valid {cert.year}</span>
            </div>
            <button
              onClick={() => handleView(cert.label)}
              className={`w-full rounded-lg border py-1.5 text-[10px] font-semibold transition ${
                viewed.has(cert.label)
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/40 dark:bg-emerald-900/20 dark:text-emerald-400"
                  : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:border-sky-700/40 dark:hover:text-sky-400"
              }`}
            >
              {viewed.has(cert.label) ? "✓ Certificate Viewed" : "View Certificate"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
