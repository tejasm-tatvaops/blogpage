"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProjectHealth, SiteJournalProject } from "@/data/siteJournals";
import { ProjectJournalCard } from "@/components/projects/ProjectJournalCard";

type Facets = { cities: string[]; projectTypes: string[] };
type Pulse = {
  totalActiveJournals: number;
  procurementWatchCount: number;
  delayRiskCount: number;
  summary: string;
};

export function ProjectsFeedView({
  projects,
  facets,
  pulse,
}: {
  projects: SiteJournalProject[];
  facets: Facets;
  pulse: Pulse;
}) {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("all");
  const [projectType, setProjectType] = useState("all");
  const [risk, setRisk] = useState<"all" | ProjectHealth>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (city !== "all" && project.city !== city) return false;
      if (projectType !== "all" && project.projectType !== projectType) return false;
      if (risk !== "all" && project.health !== risk) return false;
      if (!q) return true;
      const haystack = [project.title, project.city, project.projectType, project.updatePreview, ...project.tags].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [city, projectType, projects, query, risk]);

  const trendingTypes = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((project) => counts.set(project.projectType, (counts.get(project.projectType) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [projects]);

  const activeRegions = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((project) => {
      const key = `${project.city}, ${project.region}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [projects]);

  return (
    <section className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-10 rounded-2xl border border-app bg-surface p-6 md:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">Site Journals</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-app md:text-5xl">Site Journals</h1>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-app bg-subtle px-3 py-1 text-xs text-muted">
              {pulse.totalActiveJournals} active journals
            </span>
            <Link href="/projects/new" className="rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 transition hover:bg-orange-100">
              Start Site Journal
            </Link>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{pulse.summary}</p>
        <div className="mt-6 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Browse Site Journals by city, type, tags, updates..."
            className="h-10 rounded-xl border border-app bg-white px-3 text-sm text-app placeholder:text-muted outline-none focus:border-orange-300"
          />
          <select value={city} onChange={(event) => setCity(event.target.value)} className="h-10 rounded-xl border border-app bg-white px-3 text-sm text-app outline-none">
            <option value="all">All cities</option>
            {facets.cities.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={projectType} onChange={(event) => setProjectType(event.target.value)} className="h-10 rounded-xl border border-app bg-white px-3 text-sm text-app outline-none">
            <option value="all">All site journal types</option>
            {facets.projectTypes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select value={risk} onChange={(event) => setRisk(event.target.value as "all" | ProjectHealth)} className="h-10 rounded-xl border border-app bg-white px-3 text-sm text-app outline-none">
            <option value="all">All risk levels</option>
            <option value="stable">Stable</option>
            <option value="watch">Watch Procurement</option>
            <option value="risk">Delay Risk</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((project) => <ProjectJournalCard key={project.id} project={project} />)}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-app bg-surface p-8 text-sm text-muted md:col-span-2">
              No Site Journals match these filters.
            </div>
          ) : null}
        </div>
        <aside className="space-y-3">
          <div className="rounded-2xl border border-app bg-surface p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">AI Construction Signals</h2>
            <div className="mt-3 space-y-2 text-xs text-muted">
              <p>{pulse.procurementWatchCount} site journals on procurement watch.</p>
              <p>{pulse.delayRiskCount} site journals currently flagged for delay risk.</p>
              <p>Labor availability and steel volatility are top cross-region drivers.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-app bg-surface p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Trending Site Journal Types</h2>
            <div className="mt-3 space-y-2 text-xs text-app/80">
              {trendingTypes.map(([name, count]) => (
                <p key={name} className="flex items-center justify-between">
                  <span>{name}</span>
                  <span>{count}</span>
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-app bg-surface p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Active Regions</h2>
            <div className="mt-3 space-y-2 text-xs text-app/80">
              {activeRegions.map(([name, count]) => (
                <p key={name} className="flex items-center justify-between">
                  <span>{name}</span>
                  <span>{count}</span>
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-app bg-surface p-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-app">Top Contributors</h2>
            <div className="mt-3 space-y-2 text-xs text-app/80">
              {[...new Set(projects.map((p) => p.leadContributor.name))].slice(0, 4).map((name) => <p key={name}>{name}</p>)}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
