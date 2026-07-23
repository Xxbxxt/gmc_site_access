import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { CancelEngagementButton } from "@/components/workflow/cancel-engagement-button";
import type { ReceptionFormValues } from "@/components/workflow/reception-form";
import { ReceptionForm } from "@/components/workflow/reception-form";
import { StakeholderPanel } from "@/components/workflow/stakeholder-panel";
import { requirePinConfirmed } from "@/lib/auth/guards";
import type {
  AccessPurpose,
  ApproverRole,
  ReceptionData,
} from "@/lib/domain/types";
import { getDocumentsForEngagement } from "@/lib/services/document-service";
import { getEngagementDetail } from "@/lib/services/workflow-service";

// transportTo/transportFrom/otherInductions were free-text strings before
// 2026-07-23's switch to Yes/No — records created before that change still
// have non-boolean values in the jsonb column. Coerce on read so legacy
// engagements load correctly instead of feeding a stray string into a
// boolean-typed form field.
function normalizeReceptionData(raw: unknown): ReceptionData {
  const data = raw as Record<string, unknown>;
  const toBoolean = (value: unknown) =>
    typeof value === "boolean" ? value : !!value;
  return {
    ...(raw as ReceptionData),
    transportTo: toBoolean(data.transportTo),
    transportFrom: toBoolean(data.transportFrom),
    otherInductions: toBoolean(data.otherInductions),
  };
}

export default async function ReceptionDetailPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  const session = await requirePinConfirmed();

  const canSeeQueue = (["Receptionist", "HCM", "GMM", "DMD"] as const).some(
    (role) => session.workflowRoles.includes(role),
  );
  if (!canSeeQueue) {
    redirect("/dashboard");
  }

  const detail = await getEngagementDetail(engagementId);
  if (!detail) {
    notFound();
  }
  const { engagement, person, approvals } = detail;
  const documents = await getDocumentsForEngagement(engagementId);
  const receptionData = normalizeReceptionData(engagement.receptionData);

  const isReceptionist =
    session.workflowRoles.includes("Receptionist") &&
    session.systemRole !== "Guest";
  const noApprovalYet =
    engagement.workflowState === "AtReception" && approvals.length === 0;
  const formReadOnly =
    engagement.workflowState !== "AtReception" || !isReceptionist;

  const isGuest = session.systemRole === "Guest";
  const directRole = isGuest
    ? undefined
    : (["HCM", "GMM", "DMD"] as const).find((role) =>
        session.workflowRoles.includes(role),
      );
  const isDelegatedApprover =
    !isGuest &&
    engagement.delegatedApproverId !== null &&
    engagement.delegatedApproverId === session.staffUserId;
  const approveAs: ApproverRole | null = noApprovalYet
    ? (directRole ?? (isDelegatedApprover ? "Delegated" : null))
    : null;
  const canRequestApproval = noApprovalYet && isReceptionist;

  const defaultValues: Partial<ReceptionFormValues> = {
    passportNo: person.passportNo,
    fullName: person.fullName,
    dateOfBirth: person.dateOfBirth,
    gender: person.gender,
    nationality: person.nationality,
    email: person.email ?? "",
    phone: person.phone,
    emergencyContactName: person.emergencyContactName,
    emergencyContactPhone: person.emergencyContactPhone,
    accessPurpose: engagement.accessPurpose as AccessPurpose,
    arrivalDate: engagement.arrivalDate,
    departureDate: engagement.departureDate,
    ...receptionData,
  };

  return (
    <div>
      <PageHeader
        title={person.fullName}
        actions={
          canRequestApproval ? (
            <CancelEngagementButton engagementId={engagementId} />
          ) : undefined
        }
      />
      <div className="flex flex-col gap-6">
        <ReceptionForm
          engagementId={engagementId}
          defaultValues={defaultValues}
          uploadedDocuments={documents}
          readOnly={formReadOnly}
        />
        <StakeholderPanel
          engagementId={engagementId}
          approvals={approvals}
          approveAs={approveAs}
          canRequestApproval={canRequestApproval}
        />
      </div>
    </div>
  );
}
