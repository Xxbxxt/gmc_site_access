"use server";

import { revalidatePath } from "next/cache";

import { requireSystemAdmin } from "@/lib/auth/guards";
import { resetPin } from "@/lib/auth/pin";
import type {
  ActionResult,
  SystemRole,
  WorkflowRole,
} from "@/lib/domain/types";
import { sendEmail } from "@/lib/email/send";
import {
  accessApprovedTemplate,
  delegatedApprovalGrantedTemplate,
  pinResetTemplate,
} from "@/lib/email/templates";
import { provisionStaffUser } from "@/lib/services/auth-service";
import {
  grantDelegatedApproval,
  revokeDelegatedApproval,
} from "@/lib/services/workflow-service";

export async function provisionUserAction(
  staffUserId: string,
  systemRole: SystemRole,
  workflowRoles: WorkflowRole[],
): Promise<ActionResult> {
  try {
    await requireSystemAdmin();

    const user = await provisionStaffUser(
      staffUserId,
      systemRole,
      workflowRoles,
    );
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const emailSent = await sendEmail({
      to: user.email,
      ...accessApprovedTemplate({
        recipientName: user.displayName,
        systemRole,
        workflowRoles,
      }),
    });

    revalidatePath("/dashboard/system-admin/users");
    return emailSent
      ? { success: true }
      : {
          success: true,
          warning:
            "User provisioned, but the notification email failed to send",
        };
  } catch (error) {
    console.error("[actions/admin]", error);
    return { success: false, error: "Failed to provision user" };
  }
}

export async function grantDelegatedApprovalAction(
  engagementId: string,
  receptionistStaffUserId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const session = await requireSystemAdmin();
    const { recipient } = await grantDelegatedApproval(
      engagementId,
      receptionistStaffUserId,
      session.staffUserId,
      reason,
    );

    const emailSent = recipient
      ? await sendEmail({
          to: recipient.email,
          ...delegatedApprovalGrantedTemplate({
            recipientName: recipient.displayName,
            engagementId,
          }),
        })
      : true;

    revalidatePath("/dashboard/system-admin/delegations");
    return emailSent
      ? { success: true }
      : {
          success: true,
          warning: "Granted, but the notification email failed to send",
        };
  } catch (error) {
    console.error("[actions/admin]", error);
    return { success: false, error: "Failed to grant delegated approval" };
  }
}

export async function revokeDelegatedApprovalAction(
  engagementId: string,
): Promise<ActionResult> {
  try {
    await requireSystemAdmin();
    await revokeDelegatedApproval(engagementId);
    revalidatePath("/dashboard/system-admin/delegations");
    return { success: true };
  } catch (error) {
    console.error("[actions/admin]", error);
    return { success: false, error: "Failed to revoke delegated approval" };
  }
}

export async function resetPinAction(
  staffUserId: string,
): Promise<ActionResult> {
  try {
    await requireSystemAdmin();

    const user = await resetPin(staffUserId);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const emailSent = await sendEmail({
      to: user.email,
      ...pinResetTemplate({ recipientName: user.displayName }),
    });

    revalidatePath("/dashboard/system-admin/users");
    return emailSent
      ? { success: true }
      : {
          success: true,
          warning: "PIN reset, but the notification email failed to send",
        };
  } catch (error) {
    console.error("[actions/admin]", error);
    return { success: false, error: "Failed to reset PIN" };
  }
}
