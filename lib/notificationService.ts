import { connectToDatabase } from "@/lib/mongodb";
import { NotificationModel } from "@/models/Notification";
import { getSystemToggles } from "@/lib/systemToggles";

export type NotificationItem = {
  id: string;
  type: "reply" | "comment" | "vote";
  post_id: string;
  comment_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

type CreateNotificationInput = {
  type: "reply" | "comment" | "vote";
  post_id: string;
  comment_id?: string | null;
  recipient_key: string;
  message: string;
};

const toNotificationItem = (doc: {
  _id: { toString(): string };
  type: "reply" | "comment" | "vote";
  post_id: string;
  comment_id?: string | null;
  message: string;
  is_read: boolean;
  created_at: Date;
}): NotificationItem => ({
  id: doc._id.toString(),
  type: doc.type,
  post_id: doc.post_id,
  comment_id: doc.comment_id ?? null,
  message: doc.message,
  is_read: doc.is_read,
  created_at: doc.created_at.toISOString(),
});

export const createNotification = async (input: CreateNotificationInput): Promise<void> => {
  if (!getSystemToggles().notificationsEnabled) return;
  await connectToDatabase();
  await NotificationModel.create({
    type: input.type,
    post_id: input.post_id,
    comment_id: input.comment_id ?? null,
    recipient_key: input.recipient_key,
    message: input.message,
    is_read: false,
  });
};

export const getNotifications = async (
  recipientKey: string,
  limit = 5,
): Promise<{ items: NotificationItem[]; unreadCount: number }> => {
  await connectToDatabase();
  const safeLimit = Math.min(Math.max(1, limit), 20);
  const [docs, unreadCount] = await Promise.all([
    NotificationModel.find({ recipient_key: recipientKey })
      .sort({ created_at: -1 })
      .limit(safeLimit)
      .lean(),
    NotificationModel.countDocuments({ recipient_key: recipientKey, is_read: false }),
  ]);
  return {
    items: docs.map((d) => toNotificationItem(d as never)),
    unreadCount,
  };
};

export const markAsRead = async (recipientKey: string, notificationIds?: string[]): Promise<void> => {
  await connectToDatabase();
  const filter: Record<string, unknown> = { recipient_key: recipientKey, is_read: false };
  if (notificationIds && notificationIds.length > 0) {
    filter._id = { $in: notificationIds };
  }
  await NotificationModel.updateMany(filter, { is_read: true });
};
