import { auth } from "@/lib/auth/entra";
import type { SystemRole, WorkflowRole } from "@/lib/domain/types";

export type SessionUser = {
  staffUserId: string;
  systemRole: SystemRole;
  workflowRoles: WorkflowRole[];
  pinConfirmed: boolean;
  hasPinSet: boolean;
  displayName: string | null;
  email: string | null;
  image: string | null;
};

export async function getSession(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  return {
    staffUserId: session.user.staffUserId,
    systemRole: session.user.systemRole,
    workflowRoles: session.user.workflowRoles,
    pinConfirmed: session.user.pinConfirmed,
    hasPinSet: session.user.hasPinSet,
    displayName: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
  };
}
