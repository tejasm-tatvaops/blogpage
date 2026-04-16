"use client";

type ForumActionsProps = {
  isDeleting: boolean;
  isTogglingFeatured: boolean;
  isFeatured: boolean;
  onDelete: () => void;
  onToggleFeatured: () => void;
};

export function ForumActions({
  isDeleting,
  isTogglingFeatured,
  isFeatured,
  onDelete,
  onToggleFeatured,
}: ForumActionsProps) {
  return (
    <div className="flex justify-end gap-3">
      <button
        type="button"
        onClick={onToggleFeatured}
        disabled={isTogglingFeatured}
        className={`text-sm font-medium transition disabled:opacity-50 ${
          isFeatured ? "text-amber-700 hover:text-amber-800" : "text-indigo-700 hover:text-indigo-800"
        }`}
      >
        {isTogglingFeatured ? "Saving..." : isFeatured ? "Unfeature" : "Feature"}
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={isDeleting}
        className="text-sm font-medium text-red-600 transition hover:text-red-800 disabled:opacity-50"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}
