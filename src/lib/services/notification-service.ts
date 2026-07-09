import { and, count, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";

export type NotificationRow = typeof notifications.$inferSelect;

export async function getUnreadNotificationCount(
  recipientStaffUserId: string,
): Promise<number> {
  const [{ unreadCount }] = await db
    .select({ unreadCount: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientStaffUserId, recipientStaffUserId),
        isNull(notifications.readAt),
      ),
    );
  return unreadCount;
}

export async function getRecentNotifications(
  recipientStaffUserId: string,
  limit = 10,
): Promise<NotificationRow[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientStaffUserId, recipientStaffUserId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(
  notificationId: string,
  recipientStaffUserId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.recipientStaffUserId, recipientStaffUserId),
      ),
    );
}

export async function markAllNotificationsRead(
  recipientStaffUserId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientStaffUserId, recipientStaffUserId),
        isNull(notifications.readAt),
      ),
    );
}
