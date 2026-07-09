import type { SystemRole, WorkflowRole } from "@/lib/domain/types";

export type EmailTemplate = {
  to: string;
  subject: string;
  html: string;
};

type MessageTemplate = Omit<EmailTemplate, "to">;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function accessRequestedTemplate(opts: {
  requesterName: string;
  requesterEmail: string;
  requestedRole: string;
}): MessageTemplate {
  const requesterName = escapeHtml(opts.requesterName);
  const requesterEmail = escapeHtml(opts.requesterEmail);
  const requestedRole = escapeHtml(opts.requestedRole);
  return {
    subject: "GMC Site Access — new access request",
    html: `<p>${requesterName} (${requesterEmail}) has requested the role "${requestedRole}".</p><p><a href="${process.env.AUTH_URL}/dashboard/system-admin/users">Review and provision this request</a>.</p>`,
  };
}

export function accessApprovedTemplate(opts: {
  recipientName: string;
  systemRole: SystemRole;
  workflowRoles: WorkflowRole[];
}): MessageTemplate {
  const recipientName = escapeHtml(opts.recipientName);
  const systemRole = escapeHtml(opts.systemRole);
  const workflowRoles = opts.workflowRoles.map(escapeHtml).join(", ") || "None";
  return {
    subject: "GMC Site Access — access approved",
    html: `<p>Hi ${recipientName}, your access has been approved.</p><p>System role: ${systemRole}</p><p>Workflow roles: ${workflowRoles}</p><p><a href="${process.env.AUTH_URL}">Go to your dashboard</a> and set up your PIN to continue.</p>`,
  };
}

export function pinResetTemplate(opts: {
  recipientName: string;
}): MessageTemplate {
  const recipientName = escapeHtml(opts.recipientName);
  return {
    subject: "GMC Site Access — PIN reset",
    html: `<p>Hi ${recipientName}, your PIN has been reset by a System Administrator.</p><p>Sign in and create a new PIN to continue.</p>`,
  };
}
