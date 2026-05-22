"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { StoryComposer, type ComposePayload } from "./StoryComposer";

type Props = {
  open: boolean;
  displayName: string;
  onClose: () => void;
  onPosted: () => void;
};

export function StoryUploadModal({ open, displayName, onClose, onPosted }: Props) {
  // Portal requires document to exist (client-only)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const handleSubmit = async (payload: ComposePayload) => {
    const res = await globalThis.fetch("/api/stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, display_name: displayName }),
    });

    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      throw new Error(json.error ?? "Failed to post");
    }

    onPosted();
    onClose();
  };

  if (!mounted) return null;

  // Render directly into document.body so CSS transforms on ancestor elements
  // (e.g. Framer Motion animated hero sections) cannot break position:fixed.
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[201] flex max-h-[92dvh] flex-col rounded-t-3xl bg-app shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex shrink-0 justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-surface/30" />
            </div>

            <div className="flex shrink-0 items-center justify-between px-5 pb-3">
              <h2 className="text-lg font-bold text-app">New Story</h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-surface/10 p-2 text-app/60 transition hover:bg-surface/20"
                aria-label="Close"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-8">
              <StoryComposer onSubmit={handleSubmit} onClose={onClose} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
