"use client";

export function SummaryPanel({
  bullets,
  description,
}: {
  bullets: string[];
  description?: string;
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Quick Summary</h3>
      {description && (
        <p className="mb-3 text-sm text-slate-600">{description}</p>
      )}
      {bullets.length > 0 && (
        <>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Key points
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
