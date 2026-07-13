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

function engagementLink(engagementId: string): string {
  return `${process.env.AUTH_URL}/dashboard/reception/${engagementId}`;
}

export function stakeholderApprovalRequestedTemplate(opts: {
  personName: string;
  engagementId: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  return {
    subject: "GMC Site Access — stakeholder approval requested",
    html: `<p>Stakeholder approval is requested for ${personName}'s Reception record.</p><p>Approval from any one of HCM, GMM, or DMD is sufficient.</p><p><a href="${engagementLink(opts.engagementId)}">Review and approve</a>.</p>`,
  };
}

export function stakeholderApprovalReceivedTemplate(opts: {
  personName: string;
  engagementId: string;
  nextRole: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const nextRole = escapeHtml(opts.nextRole);
  return {
    subject: "GMC Site Access — record routed to your queue",
    html: `<p>${personName}'s Reception record has been approved and routed to ${nextRole}.</p><p><a href="${engagementLink(opts.engagementId)}">View the record</a>.</p>`,
  };
}

export function delegatedApprovalRequestedTemplate(opts: {
  personName: string;
  engagementId: string;
  reason: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const reason = escapeHtml(opts.reason);
  return {
    subject: "GMC Site Access — delegated approval requested",
    html: `<p>HCM, GMM, and DMD are unavailable to approve ${personName}'s Reception record.</p><p>Reason: ${reason}</p><p>A System Administrator may grant the Receptionist a one-off delegated approval.</p><p><a href="${engagementLink(opts.engagementId)}">Review the record</a>.</p>`,
  };
}

export function delegatedApprovalGrantedTemplate(opts: {
  recipientName: string;
  engagementId: string;
}): MessageTemplate {
  const recipientName = escapeHtml(opts.recipientName);
  return {
    subject: "GMC Site Access — delegated approval granted",
    html: `<p>Hi ${recipientName}, you've been granted a one-off delegated approval privilege for this engagement.</p><p><a href="${engagementLink(opts.engagementId)}">Complete the approval</a>.</p>`,
  };
}

export function terminationRequestedTemplate(opts: {
  personName: string;
  engagementId: string;
  reason: string;
}): MessageTemplate {
  const personName = escapeHtml(opts.personName);
  const reason = escapeHtml(opts.reason);
  return {
    subject: "GMC Site Access — access termination requested",
    html: `<p>Access termination has been requested for ${personName}.</p><p>Reason: ${reason}</p><p><a href="${engagementLink(opts.engagementId)}">Review the request</a>.</p>`,
  };
}
