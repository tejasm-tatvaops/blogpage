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
  const fetcherRef = useRef(fetcher);
  const getVersionRef = useRef(getVersion);
  const onDataRef = useRef(onData);

  useEffect(() => {
    fetcherRef.current = fetcher;
    getVersionRef.current = getVersion;
    onDataRef.current = onData;
  }, [fetcher, getVersion, onData]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      try {
        setIsPolling(true);
        const data = await fetcherRef.current();
        if (cancelled) return;
        const version = getVersionRef.current(data);
        if (versionRef.current != null && version > versionRef.current) {
          setHasNewActivity(true);
        }
        versionRef.current = version;
        onDataRef.current(data);
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
  }, [intervalMs]);

  return {
    hasNewActivity,
    isPolling,
    clearNewActivity: () => setHasNewActivity(false),
  };
}
