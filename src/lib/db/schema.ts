import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const staffUsers = pgTable("staff_users", {
  id: uuid().defaultRandom().primaryKey(),
  entraObjectId: text().notNull().unique(),
  email: text().notNull(),
  displayName: text().notNull(),
  systemRole: text().notNull(),
  workflowRoles: text().array().notNull().default([]),
  pinHash: text(),
  pinFailedAttempts: integer().notNull().default(0),
  pinLockedUntil: timestamp({ withTimezone: true }),
  provisionedAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: uuid().defaultRandom().primaryKey(),
  recipientStaffUserId: uuid()
    .notNull()
    .references(() => staffUsers.id),
  requesterStaffUserId: uuid().references(() => staffUsers.id),
  requestedRole: text(),
  engagementId: uuid(),
  message: text().notNull(),
  readAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
