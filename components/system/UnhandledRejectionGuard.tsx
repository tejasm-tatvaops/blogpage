"use client";

import { useEffect } from "react";

/**
 * Next DevTools can surface `[object Event]` when a browser-level promise
 * rejects with an Event object (not a real Error). We suppress only that
 * narrow case to avoid noisy runtime overlays, while preserving genuine errors.
 */
export function UnhandledRejectionGuard() {
  useEffect(() => {
    const isResourceTarget = (target: EventTarget | null): boolean => {
      if (!target || typeof window === "undefined") return false;
      return (
        target instanceof HTMLImageElement ||
        target instanceof HTMLVideoElement ||
        target instanceof HTMLScriptElement ||
        target instanceof HTMLLinkElement ||
        target instanceof HTMLSourceElement
      );
    };

    const isEventLike = (reason: unknown): boolean => {
      if (reason instanceof Event) return true;
      if (String(reason) === "[object Event]") return true;
      if (!reason || typeof reason !== "object") return false;
      const r = reason as Record<string, unknown>;
      return "isTrusted" in r || ("type" in r && "target" in r);
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      if (isEventLike(event.reason)) {
        console.warn("[UnhandledRejectionGuard] Ignored non-Error rejection event");
        event.preventDefault();
      }
    };

    const errorHandler = (event: ErrorEvent) => {
      // Some browser/network failures bubble up as generic Event objects.
      // Suppress only this narrow noisy case.
      if (
        String(event.error) === "[object Event]" ||
        String(event.message) === "[object Event]"
      ) {
        event.preventDefault();
      }
    };

    const resourceErrorHandler = (event: Event) => {
      if (String(event) !== "[object Event]") return;
      if (!isResourceTarget(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    window.addEventListener("unhandledrejection", rejectionHandler);
    window.addEventListener("error", errorHandler);
    window.addEventListener("error", resourceErrorHandler, true);
    const previousOnError = window.onerror;
    window.onerror = (message, _source, _lineno, _colno, error) => {
      if (String(message) === "[object Event]" || String(error) === "[object Event]") {
        return true;
      }
      if (typeof previousOnError === "function") {
        return previousOnError(message, _source, _lineno, _colno, error);
      }
      return false;
    };
    return () => {
      window.removeEventListener("unhandledrejection", rejectionHandler);
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("error", resourceErrorHandler, true);
      window.onerror = previousOnError ?? null;
    };
  }, []);

  return null;
}
