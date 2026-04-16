"use client";

import { useEffect } from "react";

/**
 * Next DevTools can surface `[object Event]` when a browser-level promise
 * rejects with an Event object (not a real Error). We suppress only that
 * narrow case to avoid noisy runtime overlays, while preserving genuine errors.
 */
export function UnhandledRejectionGuard() {
  useEffect(() => {
    const isEventLike = (reason: unknown): boolean => {
      if (reason instanceof Event) return true;
      if (String(reason) === "[object Event]") return true;
      if (!reason || typeof reason !== "object") return false;
      const r = reason as Record<string, unknown>;
      return "isTrusted" in r || ("type" in r && "target" in r);
    };

    const handler = (event: PromiseRejectionEvent) => {
      if (isEventLike(event.reason)) {
        console.warn("[UnhandledRejectionGuard] Ignored non-Error rejection event");
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return null;
}
