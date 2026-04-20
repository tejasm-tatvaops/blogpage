"use client";

import { useEffect, useRef, useState } from "react";

type Notification = {
  id: string;
  post_id: string;
  comment_id?: string | null;
  message: string;
  type: "reply" | "comment" | "vote";
  created_at: string;
  is_read: boolean;
};

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    const response = await fetch("/api/notifications?limit=5", { cache: "no-store" });
    if (!response.ok) return;
    const payload = (await response.json()) as {
      items: Notification[];
      unreadCount: number;
    };
    setNotifs(payload.items);
    setUnread(payload.unreadCount);
    setLoaded(true);
  };

  useEffect(() => {
    let inFlight = false;
    const run = async () => {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        await loadNotifications();
      } finally {
        inFlight = false;
      }
    };
    const interval = window.setInterval(() => {
      void run();
    }, 45_000);
    void run();
    return () => window.clearInterval(interval);
  }, []);

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
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && !loaded) void loadNotifications();
          if (next && unread > 0) void markAllRead();
        }}
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        className="relative rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-app bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold text-app">Notifications</span>
          </div>

          <ul className="max-h-72 overflow-y-auto divide-y divide-slate-50">
            {notifs.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet</li>
            ) : (
              notifs.map((n) => (
                <li key={n.id} className={`px-4 py-3 ${!n.is_read ? "bg-sky-50/50" : ""}`}>
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] ${
                      n.type === "vote" ? "bg-orange-100 text-orange-600" : "bg-sky-100 text-sky-600"
                    }`}>
                      {n.type === "vote" ? "▲" : "💬"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-slate-800">{n.message}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
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
