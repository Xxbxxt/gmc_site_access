import { and, arrayOverlaps, eq, notInArray } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import {
  engagements,
  notifications,
  persons,
  staffUsers,
  stakeholderApprovals,
  terminationRequests,
  workflowCycles,
  workflowTransitions,
} from "@/lib/db/schema";
import type {
  AccessPurpose,
  ApproverRole,
  ReceptionData,
  WorkflowRole,
  WorkflowState,
} from "@/lib/domain/types";
import type { StaffUser } from "@/lib/services/auth-service";
import { getMissingRequiredDocTypes } from "@/lib/services/document-service";
import {
  createPerson,
  findPersonByPassport,
  type PersonInput,
  updatePerson,
} from "@/lib/services/person-registry-service";

export type Engagement = typeof engagements.$inferSelect;
export type StakeholderApproval = typeof stakeholderApprovals.$inferSelect;
export type WorkflowCycle = typeof workflowCycles.$inferSelect;

export type ReceptionFormInput = {
  person: PersonInput;
  accessPurpose: AccessPurpose;
  arrivalDate: string;
  departureDate: string;
  receptionData: ReceptionData;
};

export async function getStaffByWorkflowRoles(
  roles: WorkflowRole[],
): Promise<StaffUser[]> {
  return db
    .select()
    .from(staffUsers)
    .where(arrayOverlaps(staffUsers.workflowRoles, roles));
}

async function getStakeholdersAndSystemAdmins(): Promise<StaffUser[]> {
  const stakeholders = await getStaffByWorkflowRoles(["HCM", "GMM", "DMD"]);
  const admins = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.systemRole, "SystemAdmin"));

  const byId = new Map<string, StaffUser>();
  for (const user of [...stakeholders, ...admins]) {
    byId.set(user.id, user);
  }
  return [...byId.values()];
}

async function notifyStaff(
  recipients: StaffUser[],
  engagementId: string,
  message: string,
): Promise<void> {
  if (recipients.length === 0) {
    return;
  }
  await db.insert(notifications).values(
    recipients.map((recipient) => ({
      recipientStaffUserId: recipient.id,
      engagementId,
      message,
    })),
  );
}

function getNextStateForPath(accessPurpose: AccessPurpose): {
  nextState: WorkflowState;
  nextRole: WorkflowRole | null;
} {
  switch (accessPurpose) {
    case "Work":
      return { nextState: "AtHospital", nextRole: "HospitalStaff" };
    case "VisitMine":
      return { nextState: "AtTraining", nextRole: "TrainingStaff" };
    case "Visit":
      return { nextState: "Completed", nextRole: null };
  }
}

export async function getEngagementById(
  engagementId: string,
): Promise<Engagement | undefined> {
  const [engagement] = await db
    .select()
    .from(engagements)
    .where(eq(engagements.id, engagementId));
  return engagement;
}

export async function getActiveWorkflowCycle(
  engagementId: string,
): Promise<WorkflowCycle | undefined> {
  const [cycle] = await db
    .select()
    .from(workflowCycles)
    .where(eq(workflowCycles.engagementId, engagementId));
  return cycle;
}

export async function listEngagementsWithPerson(): Promise<
  { engagement: Engagement; person: typeof persons.$inferSelect }[]
> {
  return db
    .select({ engagement: engagements, person: persons })
    .from(engagements)
    .innerJoin(persons, eq(engagements.personId, persons.id))
    .orderBy(engagements.createdAt);
}

export async function getEngagementDetail(engagementId: string): Promise<
  | {
      engagement: Engagement;
      person: typeof persons.$inferSelect;
      approvals: StakeholderApproval[];
    }
  | undefined
> {
  const [row] = await db
    .select({ engagement: engagements, person: persons })
    .from(engagements)
    .innerJoin(persons, eq(engagements.personId, persons.id))
    .where(eq(engagements.id, engagementId));

  if (!row) {
    return undefined;
  }

  const approvals = await db
    .select()
    .from(stakeholderApprovals)
    .where(eq(stakeholderApprovals.engagementId, engagementId));

  return { ...row, approvals };
}

const TERMINAL_WORKFLOW_STATES: WorkflowState[] = ["Completed", "Cancelled"];

export async function getActiveEngagementForPassport(
  passportNo: string,
): Promise<{ engagementId: string; workflowState: WorkflowState } | undefined> {
  const person = await findPersonByPassport(passportNo);
  if (!person) {
    return undefined;
  }

  const [active] = await db
    .select()
    .from(engagements)
    .where(
      and(
        eq(engagements.personId, person.id),
        notInArray(engagements.workflowState, TERMINAL_WORKFLOW_STATES),
      ),
    );

  return active
    ? {
        engagementId: active.id,
        workflowState: active.workflowState as WorkflowState,
      }
    : undefined;
}

export async function createEngagement(
  input: ReceptionFormInput,
  createdBy: string,
): Promise<Engagement> {
  const active = await getActiveEngagementForPassport(input.person.passportNo);
  if (active) {
    throw new Error(
      `This passport already has an active engagement (currently ${active.workflowState}) — open that record instead of creating a new one.`,
    );
  }

  let person = await findPersonByPassport(input.person.passportNo);
  person = person
    ? ((await updatePerson(person.id, input.person)) ?? person)
    : await createPerson(input.person);

  const [engagement] = await db
    .insert(engagements)
    .values({
      personId: person.id,
      accessPurpose: input.accessPurpose,
      arrivalDate: input.arrivalDate,
      departureDate: input.departureDate,
      receptionData: input.receptionData,
    })
    .returning();

  const [cycle] = await db
    .insert(workflowCycles)
    .values({ engagementId: engagement.id, cycleNumber: 1 })
    .returning();

  await db.insert(workflowTransitions).values({
    engagementId: engagement.id,
    workflowCycleId: cycle.id,
    fromState: "Draft",
    toState: "AtReception",
    performedBy: createdBy,
  });

  return engagement;
}

export async function updateReceptionData(
  engagementId: string,
  input: ReceptionFormInput,
): Promise<Engagement> {
  const engagement = await getEngagementById(engagementId);
  if (!engagement) {
    throw new Error("Engagement not found");
  }
  if (engagement.workflowState !== "AtReception") {
    throw new Error("Reception layer is read-only after approval");
  }

  await updatePerson(engagement.personId, input.person);

  const [updated] = await db
    .update(engagements)
    .set({
      accessPurpose: input.accessPurpose,
      arrivalDate: input.arrivalDate,
      departureDate: input.departureDate,
      receptionData: input.receptionData,
    })
    .where(eq(engagements.id, engagementId))
    .returning();

  return updated;
}

export async function cancelEngagement(
  engagementId: string,
  performedBy: string,
): Promise<Engagement> {
  const engagement = await getEngagementById(engagementId);
  if (!engagement) {
    throw new Error("Engagement not found");
  }
  if (engagement.workflowState !== "AtReception") {
    throw new Error("Only an engagement still at Reception can be cancelled");
  }

  const [existing] = await db
    .select()
    .from(stakeholderApprovals)
    .where(eq(stakeholderApprovals.engagementId, engagementId));
  if (existing) {
    throw new Error("An approved engagement can no longer be cancelled");
  }

  const cycle = await getActiveWorkflowCycle(engagementId);
  if (!cycle) {
    throw new Error("No active workflow cycle for this engagement");
  }

  const [updated] = await db
    .update(engagements)
    .set({ workflowState: "Cancelled" })
    .where(eq(engagements.id, engagementId))
    .returning();

  await db.insert(workflowTransitions).values({
    engagementId,
    workflowCycleId: cycle.id,
    fromState: "AtReception",
    toState: "Cancelled",
    performedBy,
  });

  return updated;
}

export async function submitForStakeholderApproval(
  engagementId: string,
): Promise<{ recipients: StaffUser[] }> {
  const engagement = await getEngagementById(engagementId);
  if (!engagement) {
    throw new Error("Engagement not found");
  }
  if (engagement.workflowState !== "AtReception") {
    throw new Error("Engagement is not awaiting Reception approval");
  }

  const missing = await getMissingRequiredDocTypes(engagementId);
  if (missing.length > 0) {
    throw new Error(
      `Upload all applicable documents before requesting approval: ${missing.join(", ")}`,
    );
  }

  const recipients = await getStaffByWorkflowRoles(["HCM", "GMM", "DMD"]);
  await notifyStaff(
    recipients,
    engagementId,
    "Stakeholder approval requested — HCM, GMM, or DMD sign-off needed.",
  );

  return { recipients };
}

export async function applyStakeholderApproval(
  engagementId: string,
  session: SessionUser,
  input: {
    signature: string;
  },
  performedBy: string,
): Promise<{
  engagement: Engagement;
  recipients: StaffUser[];
  nextRole: WorkflowRole | null;
}> {
  const engagement = await getEngagementById(engagementId);
  if (!engagement) {
    throw new Error("Engagement not found");
  }
  if (engagement.workflowState !== "AtReception") {
    throw new Error("Engagement is not awaiting Reception approval");
  }

  const [existing] = await db
    .select()
    .from(stakeholderApprovals)
    .where(eq(stakeholderApprovals.engagementId, engagementId));
  if (existing) {
    throw new Error("Engagement has already been approved");
  }

  const directRole = (["HCM", "GMM", "DMD"] as const).find((role) =>
    session.workflowRoles.includes(role),
  );
  const isDelegatedApprover =
    !directRole &&
    engagement.delegatedApproverId !== null &&
    engagement.delegatedApproverId === session.staffUserId;

  if (!directRole && !isDelegatedApprover) {
    throw new Error("Not authorized to approve this engagement");
  }

  const approverRole: ApproverRole = directRole ?? "Delegated";
  const approverName = session.displayName ?? "";

  await db.insert(stakeholderApprovals).values({
    engagementId,
    approverRole,
    approverStaffUserId: session.staffUserId,
    approverName,
    signature: input.signature,
    isDelegated: isDelegatedApprover,
    delegatedBy: isDelegatedApprover ? engagement.delegationGrantedBy : null,
    delegatedAt: isDelegatedApprover ? engagement.delegationGrantedAt : null,
    delegationReason: isDelegatedApprover ? engagement.delegationReason : null,
  });

  const cycle = await getActiveWorkflowCycle(engagementId);
  if (!cycle) {
    throw new Error("No active workflow cycle for this engagement");
  }

  const { nextState, nextRole } = getNextStateForPath(
    engagement.accessPurpose as AccessPurpose,
  );

  const [updated] = await db
    .update(engagements)
    .set({
      workflowState: nextState,
      delegatedApproverId: null,
      delegationGrantedBy: null,
      delegationGrantedAt: null,
      delegationReason: null,
    })
    .where(eq(engagements.id, engagementId))
    .returning();

  await db.insert(workflowTransitions).values({
    engagementId,
    workflowCycleId: cycle.id,
    fromState: "AtReception",
    toState: nextState,
    performedBy,
    comments: `Approved by ${approverName} (${approverRole})`,
  });

  let recipients: StaffUser[] = [];
  if (nextRole) {
    recipients = await getStaffByWorkflowRoles([nextRole]);
    await notifyStaff(
      recipients,
      engagementId,
      `Engagement approved at Reception and routed to ${nextRole}.`,
    );
  }

  return { engagement: updated, recipients, nextRole };
}

export async function requestDelegatedApproval(
  engagementId: string,
  reason: string,
): Promise<{ recipients: StaffUser[] }> {
  const engagement = await getEngagementById(engagementId);
  if (!engagement) {
    throw new Error("Engagement not found");
  }
  if (engagement.workflowState !== "AtReception") {
    throw new Error("Engagement is not awaiting Reception approval");
  }

  const recipients = await getStakeholdersAndSystemAdmins();
  await notifyStaff(
    recipients,
    engagementId,
    `Delegated approval requested — HCM, GMM, and DMD are unavailable. Reason: ${reason}`,
  );

  return { recipients };
}

export async function grantDelegatedApproval(
  engagementId: string,
  receptionistStaffUserId: string,
  grantedBy: string,
  reason: string,
): Promise<{ engagement: Engagement; recipient: StaffUser | undefined }> {
  const [engagement] = await db
    .update(engagements)
    .set({
      delegatedApproverId: receptionistStaffUserId,
      delegationGrantedBy: grantedBy,
      delegationGrantedAt: new Date(),
      delegationReason: reason,
    })
    .where(eq(engagements.id, engagementId))
    .returning();

  const [recipient] = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.id, receptionistStaffUserId));

  if (recipient) {
    await notifyStaff(
      [recipient],
      engagementId,
      "You've been granted a one-off delegated approval privilege for this engagement.",
    );
  }

  return { engagement, recipient };
}

export async function revokeDelegatedApproval(
  engagementId: string,
): Promise<void> {
  await db
    .update(engagements)
    .set({
      delegatedApproverId: null,
      delegationGrantedBy: null,
      delegationGrantedAt: null,
      delegationReason: null,
    })
    .where(eq(engagements.id, engagementId));
}

export async function requestTermination(
  engagementId: string,
  requestedBy: string,
  reason: string,
): Promise<{ recipients: StaffUser[] }> {
  await db
    .insert(terminationRequests)
    .values({ engagementId, requestedBy, reason });

  const admins = await db
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.systemRole, "SystemAdmin"));

  await notifyStaff(
    admins,
    engagementId,
    `Access termination requested. Reason: ${reason}`,
  );

  return { recipients: admins };
}
