"use client";

import { useEffect, useRef, useState } from "react";

type Notification = {
  id: string;
  message: string;
  type: "trending" | "new_post";
  slug?: string;
  timestamp: number;
  read: boolean;
};

const NOTIFS_KEY = "tatvaops_notifications";
const MAX_NOTIFS = 20;

export function getNotifications(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(NOTIFS_KEY) ?? "[]") as Notification[];
  } catch {
    return [];
  }
}

export function pushNotification(notif: Omit<Notification, "id" | "timestamp" | "read">) {
  const current = getNotifications();
  const newNotif: Notification = {
    ...notif,
    id: Math.random().toString(36).slice(2),
    timestamp: Date.now(),
    read: false,
  };
  const updated = [newNotif, ...current].slice(0, MAX_NOTIFS);
  localStorage.setItem(NOTIFS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent("notifications-changed"));
}

export function NotificationBell() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const reload = () => setNotifs(getNotifications());

  useEffect(() => {
    reload();
    window.addEventListener("notifications-changed", reload);
    return () => window.removeEventListener("notifications-changed", reload);
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

  const unread = notifs.filter((n) => !n.read).length;

  const markAllRead = () => {
    const updated = notifs.map((n) => ({ ...n, read: true }));
    localStorage.setItem(NOTIFS_KEY, JSON.stringify(updated));
    setNotifs(updated);
  };

  const clearAll = () => {
    localStorage.removeItem(NOTIFS_KEY);
    setNotifs([]);
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unread > 0) markAllRead();
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
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-sm font-bold text-slate-900">Notifications</span>
            {notifs.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[11px] font-medium text-slate-400 hover:text-red-500 transition"
              >
                Clear all
              </button>
            )}
          </div>

          <ul className="max-h-72 overflow-y-auto divide-y divide-slate-50">
            {notifs.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet</li>
            ) : (
              notifs.map((n) => (
                <li key={n.id} className={`px-4 py-3 ${!n.read ? "bg-sky-50/50" : ""}`}>
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] ${
                      n.type === "trending" ? "bg-orange-100 text-orange-600" : "bg-sky-100 text-sky-600"
                    }`}>
                      {n.type === "trending" ? "🔥" : "✨"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-slate-800">{n.message}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {new Date(n.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
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
