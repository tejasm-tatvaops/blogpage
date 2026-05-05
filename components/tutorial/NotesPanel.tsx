"use client";

import { useState } from "react";

type TutorialNote = {
  time: number;
  note: string;
};

export function NotesPanel({
  notes,
  currentTime,
  onAdd,
  onSeek,
}: {
  notes: TutorialNote[];
  currentTime: number;
  onAdd: (note: TutorialNote) => void;
  onSeek: (time: number) => void;
}) {
  const [text, setText] = useState("");
  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);

  return (
    <div className="rounded-xl border border-app bg-surface p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">Notes</h3>
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={`Note at ${Math.floor(currentTime)}s...`}
          className="w-full rounded-lg border border-app px-3 py-2 text-sm outline-none focus:border-sky-400"
        />
        <button
          type="button"
          onClick={() => {
            if (!text.trim()) return;
            onAdd({ time: Math.floor(currentTime), note: text.trim() });
            setText("");
          }}
          className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
        >
          Add
        </button>
      </div>
      <ul className="space-y-2">
        {sortedNotes.map((item) => (
          <li key={`${item.time}-${item.note}`} className="rounded-lg border border-app bg-subtle px-3 py-2">
            <button
              type="button"
              onClick={() => onSeek(item.time)}
              className="text-xs font-semibold text-sky-700 hover:underline"
            >
              {item.time}s
            </button>
            <p className="mt-1 text-sm text-slate-600">{item.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type { TutorialNote };
