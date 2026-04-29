"use client";

type TabId = "transcript" | "summary" | "notes";

const TAB_ITEMS: Array<{ id: TabId; label: string }> = [
  { id: "transcript", label: "Transcript" },
  { id: "summary", label: "Summary" },
  { id: "notes", label: "Notes" },
];

export function TutorialTabs({
  activeTab,
  onChange,
}: {
  activeTab: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <div className="mb-4 border-b flex gap-6 text-sm font-medium">
      {TAB_ITEMS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`border-b-2 pb-2 transition ${
            activeTab === tab.id
              ? "border-sky-500 text-sky-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export type { TabId };
