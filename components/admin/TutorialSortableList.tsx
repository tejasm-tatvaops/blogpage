"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type TutorialRow = {
  _id: string;
  title: string;
  slug: string;
  difficulty: string;
  published: boolean;
  estimated_minutes: number;
  created_at: string;
  sort_order?: number;
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     "bg-emerald-50 text-emerald-700",
  intermediate: "bg-amber-50 text-amber-700",
  advanced:     "bg-red-50 text-red-600",
};

function DragHandle() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden className="text-slate-300 hover:text-slate-500 transition cursor-grab active:cursor-grabbing"
    >
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SortableRow({
  tutorial,
  deleting,
  onDelete,
}: {
  tutorial: TutorialRow;
  deleting: boolean;
  onDelete: (tutorial: TutorialRow) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tutorial._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-subtle ${isDragging ? "bg-sky-50 shadow-md" : ""}`}
    >
      <td className="px-3 py-3">
        <button type="button" {...attributes} {...listeners} className="flex items-center justify-center p-0.5">
          <DragHandle />
        </button>
      </td>
      <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-800">
        {tutorial.title}
      </td>
      <td className="px-4 py-3">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${DIFFICULTY_COLORS[tutorial.difficulty] ?? "bg-slate-100 text-slate-600"}`}>
          {tutorial.difficulty}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium ${tutorial.published ? "text-emerald-600" : "text-slate-400"}`}>
          {tutorial.published ? "Published" : "Draft"}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-500">{tutorial.estimated_minutes}m</td>
      <td className="px-4 py-3 text-slate-400">
        {new Date(tutorial.created_at).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
        })}
      </td>
      <td className="px-4 py-3">
        <Link href={`/tutorials/${tutorial.slug}`} target="_blank" className="text-xs text-sky-600 hover:underline">
          View
        </Link>
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => onDelete(tutorial)}
          disabled={deleting}
          className="text-xs font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </td>
    </tr>
  );
}

async function persistOrder(items: TutorialRow[]) {
  const payload = items.map((t, i) => ({ id: t._id, order: i }));
  await fetch("/api/admin/tutorials/reorder", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function TutorialSortableList({ initialTutorials }: { initialTutorials: TutorialRow[] }) {
  const [items, setItems] = useState(initialTutorials);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((t) => t._id === active.id);
    const newIndex = items.findIndex((t) => t._id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    setItems(reordered);
    setError(null);
    setSaving(true);

    try {
      await persistOrder(reordered);
    } catch {
      setError("Failed to save order — drag again to retry.");
      setItems(items); // rollback
    } finally {
      setSaving(false);
    }
  }, [items]);

  const handleDelete = useCallback(async (tutorial: TutorialRow) => {
    const confirmed = window.confirm(`Delete tutorial "${tutorial.title}"? This removes related progress and references.`);
    if (!confirmed) return;

    setDeletingId(tutorial._id);
    setError(null);
    const previous = items;
    setItems((current) => current.filter((row) => row._id !== tutorial._id));

    try {
      const res = await fetch(`/api/admin/tutorials/${tutorial._id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Delete failed.");
      }
    } catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }, [items]);

  return (
    <div>
      {(saving || error) && (
        <div className={`mb-3 rounded-lg px-4 py-2 text-sm ${error ? "bg-red-50 text-red-600" : "bg-sky-50 text-sky-700"}`}>
          {error ?? "Saving order…"}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-app bg-surface">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((t) => t._id)} strategy={verticalListSortingStrategy}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-subtle text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-3 w-8"></th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Difficulty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3"></th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((t) => (
                  <SortableRow
                    key={t._id}
                    tutorial={t}
                    deleting={deletingId === t._id}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
