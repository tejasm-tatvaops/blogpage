"use client";

import { useMemo, useState } from "react";

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export default function EstimatePage() {
  const [squareFeet, setSquareFeet] = useState(1200);
  const [location, setLocation] = useState("Bangalore");
  const [submitted, setSubmitted] = useState(false);

  const estimate = useMemo(() => {
    const min = squareFeet * 1500;
    const max = squareFeet * 2500;
    return { min, max };
  }, [squareFeet]);

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-7 shadow-md">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Construction Estimate Tool</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Get an instant benchmark range using a standard band of{" "}
          <span className="font-semibold text-slate-800">INR 1,500-2,500 per sq ft</span>.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(true);
          }}
        >
          <div>
            <label htmlFor="square-feet" className="mb-1.5 block text-sm font-medium text-slate-700">
              Built-up area (sq ft)
            </label>
            <input
              id="square-feet"
              type="number"
              min={100}
              step={10}
              value={squareFeet}
              onChange={(event) => setSquareFeet(Math.max(100, Number(event.target.value || 100)))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-sky-500 focus:ring-2"
              required
            />
          </div>

          <div>
            <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-slate-700">
              Location
            </label>
            <input
              id="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-sky-500 focus:ring-2"
              placeholder="e.g. Hyderabad"
              required
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            Estimate Cost
          </button>
        </form>

        {submitted && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estimated range</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatCurrency(estimate.min)} - {formatCurrency(estimate.max)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Based on {squareFeet} sq ft in {location}. This is a planning benchmark; final cost depends on
              BOQ scope, finish level, and local execution constraints.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
