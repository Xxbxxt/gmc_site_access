import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

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

export const persons = pgTable("persons", {
  id: uuid().defaultRandom().primaryKey(),
  passportNo: text().notNull().unique(),
  fullName: text().notNull(),
  dateOfBirth: date().notNull(),
  gender: text().notNull(),
  nationality: text().notNull(),
  email: text(),
  phone: text().notNull(),
  emergencyContactName: text().notNull(),
  emergencyContactPhone: text().notNull(),
});

export const engagements = pgTable(
  "engagements",
  {
    id: uuid().defaultRandom().primaryKey(),
    personId: uuid()
      .notNull()
      .references(() => persons.id),
    accessPurpose: text().notNull(),
    arrivalDate: date().notNull(),
    departureDate: date().notNull(),
    workflowState: text().notNull().default("AtReception"),
    accessState: text().notNull().default("Pending"),
    isVisaFlagged: boolean().notNull().default(false),
    receptionData: jsonb().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    delegatedApproverId: uuid().references(() => staffUsers.id),
    delegationGrantedBy: uuid().references(() => staffUsers.id),
    delegationGrantedAt: timestamp({ withTimezone: true }),
    delegationReason: text(),
  },
  (table) => [
    // Only one non-terminal (active) engagement per person at a time —
    // mirrors the app-level guard in `getActiveEngagementForPassport`, but
    // enforced by Postgres so two concurrent Reception submissions for the
    // same passport can't both slip past that check and create duplicates.
    uniqueIndex("engagements_active_person_id_idx")
      .on(table.personId)
      .where(sql`${table.workflowState} not in ('Completed', 'Cancelled')`),
  ],
);

export const workflowCycles = pgTable("workflow_cycles", {
  id: uuid().defaultRandom().primaryKey(),
  engagementId: uuid()
    .notNull()
    .references(() => engagements.id),
  cycleNumber: integer().notNull(),
  archivedAt: timestamp({ withTimezone: true }),
});

export const documents = pgTable("documents", {
  id: uuid().defaultRandom().primaryKey(),
  engagementId: uuid()
    .notNull()
    .references(() => engagements.id),
  workflowCycleId: uuid().references(() => workflowCycles.id),
  docType: text().notNull(),
  blobUrl: text().notNull(),
  uploadedBy: uuid()
    .notNull()
    .references(() => staffUsers.id),
  uploadedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});

export const stakeholderApprovals = pgTable("stakeholder_approvals", {
  id: uuid().defaultRandom().primaryKey(),
  engagementId: uuid()
    .notNull()
    .unique()
    .references(() => engagements.id),
  approverRole: text().notNull(),
  approverStaffUserId: uuid()
    .notNull()
    .references(() => staffUsers.id),
  approverName: text().notNull(),
  signature: text().notNull(),
  approvedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  isDelegated: boolean().notNull().default(false),
  delegatedBy: uuid().references(() => staffUsers.id),
  delegatedAt: timestamp({ withTimezone: true }),
  delegationReason: text(),
});

export const workflowTransitions = pgTable("workflow_transitions", {
  id: uuid().defaultRandom().primaryKey(),
  engagementId: uuid()
    .notNull()
    .references(() => engagements.id),
  workflowCycleId: uuid()
    .notNull()
    .references(() => workflowCycles.id),
  fromState: text().notNull(),
  toState: text().notNull(),
  performedBy: uuid()
    .notNull()
    .references(() => staffUsers.id),
  performedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  comments: text(),
});

export const hospitalClearances = pgTable(
  "hospital_clearances",
  {
    id: uuid().defaultRandom().primaryKey(),
    workflowCycleId: uuid()
      .notNull()
      .references(() => workflowCycles.id),
    clearanceStatus: text().notNull(),
    doctorComments: text().notNull(),
    clearanceDate: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "hospital_clearances_clearance_status_check",
      sql`${table.clearanceStatus} in ('Fit', 'FitWithConditions', 'Unfit')`,
    ),
  ],
);

export const terminationRequests = pgTable("termination_requests", {
  id: uuid().defaultRandom().primaryKey(),
  engagementId: uuid()
    .notNull()
    .references(() => engagements.id),
  requestedBy: uuid()
    .notNull()
    .references(() => staffUsers.id),
  reason: text().notNull(),
  status: text().notNull().default("Pending"),
  decidedBy: uuid().references(() => staffUsers.id),
  decidedAt: timestamp({ withTimezone: true }),
});

export const notifications = pgTable("notifications", {
  id: uuid().defaultRandom().primaryKey(),
  recipientStaffUserId: uuid()
    .notNull()
    .references(() => staffUsers.id),
  requesterStaffUserId: uuid().references(() => staffUsers.id),
  requestedRole: text(),
  engagementId: uuid().references(() => engagements.id),
  message: text().notNull(),
  readAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
});
