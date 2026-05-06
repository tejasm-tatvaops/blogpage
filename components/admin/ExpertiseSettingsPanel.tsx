"use client";

import { useEffect, useMemo, useState } from "react";

type ExpertiseConfig = {
  professions: string[];
  expertiseAreas: string[];
  badgeLabels: string[];
  updatedByAdmin: string | null;
  updatedByAdminAt: string | null;
};

type ListEditorProps = {
  title: string;
  items: string[];
  addLabel: string;
  onChange: (next: string[]) => void;
};

function ListEditor({ title, items, addLabel, onChange }: ListEditorProps) {
  const [draft, setDraft] = useState("");
  const normalized = useMemo(() => items.map((item) => item.trim()).filter(Boolean), [items]);

  return (
    <section className="rounded-xl border border-app bg-surface p-4">
      <h3 className="text-sm font-semibold text-app">{title}</h3>
      <div className="mt-3 space-y-2">
        {normalized.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-2">
            <input
              value={item}
              onChange={(event) => {
                const next = [...normalized];
                next[index] = event.target.value;
                onChange(next);
              }}
              className="h-9 flex-1 rounded-md border border-app bg-surface px-3 text-sm text-app"
            />
            <button
              type="button"
              onClick={() => onChange(normalized.filter((_, i) => i !== index))}
              className="rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
            >
              Delete
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={addLabel}
            className="h-9 flex-1 rounded-md border border-app bg-surface px-3 text-sm text-app"
          />
          <button
            type="button"
            onClick={() => {
              const value = draft.trim();
              if (!value) return;
              onChange([...normalized, value]);
              setDraft("");
            }}
            className="rounded-md border border-app px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-subtle"
          >
            + Add
          </button>
        </div>
      </div>
    </section>
  );
}

export function ExpertiseSettingsPanel() {
  const [config, setConfig] = useState<ExpertiseConfig>({
    professions: [],
    expertiseAreas: [],
    badgeLabels: [],
    updatedByAdmin: null,
    updatedByAdminAt: null,
  });
  const [saving, setSaving] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch("/api/admin/expertise-config", { cache: "no-store" });
        const payload = (await response.json()) as ExpertiseConfig;
        if (!cancelled && response.ok) setConfig(payload);
      } catch {
        if (!cancelled) setError("Failed to load expertise settings.");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-app">Expertise Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Lightweight configuration lists for professions, expertise areas, and badge labels.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowRestoreConfirm(true)}
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
        >
          Restore Default Config
        </button>
      </div>
      {(config.updatedByAdmin || config.updatedByAdminAt) ? (
        <p className="text-xs text-muted">
          Last updated {config.updatedByAdminAt ? new Date(config.updatedByAdminAt).toLocaleString() : "recently"}
          {config.updatedByAdmin ? ` by ${config.updatedByAdmin}` : ""}
        </p>
      ) : null}

      <ListEditor
        title="Profession Types"
        items={config.professions}
        addLabel="Add profession (e.g. MEP Consultant)"
        onChange={(next) => setConfig((prev) => ({ ...prev, professions: next }))}
      />

      <ListEditor
        title="Expertise Areas"
        items={config.expertiseAreas}
        addLabel="Add expertise area"
        onChange={(next) => setConfig((prev) => ({ ...prev, expertiseAreas: next }))}
      />

      <ListEditor
        title="Badge Labels"
        items={config.badgeLabels}
        addLabel="Add badge label"
        onChange={(next) => setConfig((prev) => ({ ...prev, badgeLabels: next }))}
      />

      {(error || success) && (
        <div className="rounded-lg border border-app bg-surface px-3 py-2 text-sm">
          {error ? <p className="text-rose-600">{error}</p> : null}
          {success ? <p className="text-emerald-700">{success}</p> : null}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setError(null);
            setSuccess(null);
            try {
              const response = await fetch("/api/admin/expertise-config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  professions: config.professions,
                  expertiseAreas: config.expertiseAreas,
                  badgeLabels: config.badgeLabels,
                }),
              });
              const payload = (await response.json().catch(() => ({}))) as ExpertiseConfig & { error?: string };
              if (!response.ok) throw new Error(payload.error ?? "Failed to save.");
              setConfig(payload);
              setSuccess("Expertise settings saved.");
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to save.");
            } finally {
              setSaving(false);
            }
          }}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold !text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
      {showRestoreConfirm ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-md rounded-xl border border-app bg-surface p-4 shadow-xl">
            <p className="text-sm font-semibold text-app">Restore default expertise configuration?</p>
            <p className="mt-2 text-sm text-muted">
              This will replace custom professions, expertise areas, and badge labels with platform defaults.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRestoreConfirm(false)}
                className="rounded-md border border-app px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setError(null);
                  setSuccess(null);
                  try {
                    const response = await fetch("/api/admin/expertise-config/reset", { method: "POST" });
                    const payload = (await response.json().catch(() => ({}))) as ExpertiseConfig & { error?: string };
                    if (!response.ok) throw new Error(payload.error ?? "Failed to restore defaults.");
                    setConfig(payload);
                    setSuccess("Default expertise configuration restored.");
                    setShowRestoreConfirm(false);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to restore defaults.");
                  } finally {
                    setSaving(false);
                  }
                }}
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-60"
              >
                Restore Defaults
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
