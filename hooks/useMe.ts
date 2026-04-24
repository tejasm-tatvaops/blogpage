"use client";

import useSWR from "swr";

export type MeNotification = {
  id: string;
  post_id: string;
  comment_id?: string | null;
  message: string;
  type: "reply" | "comment" | "vote";
  created_at: string;
  is_read: boolean;
};

export type MePayload = {
  session: {
    user?: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      level?: string | null;
    } | null;
    expires?: string;
  } | null;
  reputation: { score: number; level: string };
  notifications: { items: MeNotification[]; unreadCount: number };
};

const fetcher = async (url: string): Promise<MePayload> => {
  const response = await fetch(url, { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("Failed to fetch /api/me");
  return response.json() as Promise<MePayload>;
};

export function useMe() {
  return useSWR<MePayload>("/api/me", fetcher, {
    dedupingInterval: 5000,
    revalidateOnFocus: false,
    revalidateIfStale: false,
    refreshInterval: 45_000,
  });
}

