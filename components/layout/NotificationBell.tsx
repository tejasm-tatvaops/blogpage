"use client";

import { useEffect, useRef, useState } from "react";
import { mutate } from "swr";
import { useMe } from "@/hooks/useMe";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { data } = useMe();
  const notifs = data?.notifications?.items ?? [];
  const unread = Number(data?.notifications?.unreadCount ?? 0);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = async () => {
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await mutate("/api/me");
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && unread > 0) void markAllRead();
        }}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-app bg-surface p-0 text-muted shadow-sm transition hover:bg-subtle hover:text-app"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[0.54rem] font-bold leading-none text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-app bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-app px-4 py-3">
            <span className="text-[0.95rem] font-semibold leading-tight text-app">Notifications</span>
          </div>

          <ul className="max-h-72 divide-y divide-black/5 overflow-y-auto dark:divide-[#1e2440]">
            {notifs.length === 0 ? (
              <li className="px-4 py-6 text-center text-[0.78rem] font-normal leading-[1.5] text-slate-400 dark:text-[#4d5470]">
                No notifications yet
              </li>
            ) : (
              notifs.map((n) => (
                <li key={n.id} className={`px-4 py-3 ${!n.is_read ? "bg-orange-50 dark:bg-orange-500/[0.07]" : ""}`}>
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.54rem] leading-none ${
                      n.type === "vote"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                        : "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                    }`}>
                      {n.type === "vote" ? "▲" : "💬"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.78rem] font-normal leading-[1.5] text-slate-800 dark:text-[#f0f2ff]">{n.message}</p>
                      <p className="mt-0.5 text-[0.56rem] font-normal leading-none text-slate-400 dark:text-[#4d5470]">
                        {new Date(n.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
