"use client";

import { useEffect, useRef, useState } from "react";

type PollingOptions<T> = {
  intervalMs?: number;
  fetcher: () => Promise<T>;
  getVersion: (data: T) => number;
  onData: (data: T) => void;
};

export function useActivityPolling<T>({
  intervalMs = 12_000,
  fetcher,
  getVersion,
  onData,
}: PollingOptions<T>) {
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const versionRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      try {
        setIsPolling(true);
        const data = await fetcher();
        if (cancelled) return;
        const version = getVersion(data);
        if (versionRef.current != null && version > versionRef.current) {
          setHasNewActivity(true);
        }
        versionRef.current = version;
        onData(data);
      } finally {
        if (!cancelled) setIsPolling(false);
      }
    };

    void run();
    const interval = window.setInterval(() => void run(), intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [fetcher, getVersion, intervalMs, onData]);

  return {
    hasNewActivity,
    isPolling,
    clearNewActivity: () => setHasNewActivity(false),
  };
}
