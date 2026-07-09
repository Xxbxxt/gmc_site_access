import { getSession, type SessionUser } from "@/lib/auth/session";
import type { WorkflowRole } from "@/lib/domain/types";

export async function requireProvisioned(): Promise<SessionUser> {
  const session = await getSession();
  if (!session || session.systemRole === "User") {
    throw new Error("Not provisioned");
  }
  return session;
}

export async function requirePinConfirmed(): Promise<SessionUser> {
  const session = await requireProvisioned();
  if (!session.pinConfirmed) {
    throw new Error("PIN not confirmed");
  }
  return session;
}

export async function requireSystemAdmin(): Promise<SessionUser> {
  const session = await requirePinConfirmed();
  if (session.systemRole !== "SystemAdmin") {
    throw new Error("System Admin required");
  }
  return session;
}

export async function requireWriteAccess(
  layer: WorkflowRole,
): Promise<SessionUser> {
  const session = await requirePinConfirmed();
  if (
    session.systemRole === "Guest" ||
    !session.workflowRoles.includes(layer)
  ) {
    throw new Error("Write access required");
  }
  return session;
}
