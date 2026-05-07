"use client";

import { useMemo, useState } from "react";

export function WeeklyExecutiveBriefCard({
  projectTitle,
  week,
  changed,
  risk,
  procurement,
  executionHealth,
  laborCondition,
  nextWeekForecast,
  actions,
}: {
  projectTitle: string;
  week: number;
  changed: string;
  risk: string;
  procurement: string;
  executionHealth: string;
  laborCondition: string;
  nextWeekForecast: string;
  actions: string[];
}) {
  const [copied, setCopied] = useState(false);

  const briefText = useMemo(
    () =>
      [
        `Weekly Site Brief — ${projectTitle} (Week ${week})`,
        "",
        `What changed: ${changed}`,
        `Biggest risk: ${risk}`,
        `Procurement movement: ${procurement}`,
        `Execution health: ${executionHealth}`,
        `Labor condition: ${laborCondition}`,
        `Next-week forecast: ${nextWeekForecast}`,
        "",
        "Recommended actions:",
        ...actions.map((item, idx) => `${idx + 1}. ${item}`),
      ].join("\n"),
    [actions, changed, executionHealth, laborCondition, nextWeekForecast, procurement, projectTitle, risk, week],
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(briefText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore clipboard failures silently
    }
  };

  return (
    <section className="rounded-2xl border border-app bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">Weekly Site Brief</p>
          <p className="mt-1 text-sm text-muted">Operational snapshot for Week {week}</p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-full border border-app bg-subtle px-3 py-1 text-[11px] text-app transition hover:border-orange-200"
        >
          {copied ? "Copied" : "Copy brief"}
        </button>
      </div>

      <div className="mt-4 space-y-1 text-sm text-app/85">
        <p><span className="font-semibold">What changed:</span> {changed}</p>
        <p><span className="font-semibold">Biggest risk:</span> {risk}</p>
        <p><span className="font-semibold">Procurement movement:</span> {procurement}</p>
        <p><span className="font-semibold">Execution health:</span> {executionHealth}</p>
        <p><span className="font-semibold">Labor condition:</span> {laborCondition}</p>
        <p><span className="font-semibold">Next-week forecast:</span> {nextWeekForecast}</p>
      </div>

      <div className="mt-4 border-l border-app/70 pl-4 text-sm text-muted">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-app/75">Recommended actions</p>
        <ul className="space-y-1">
          {actions.map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
