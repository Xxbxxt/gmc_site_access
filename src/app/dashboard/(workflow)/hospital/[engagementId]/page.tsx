import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { HospitalForm } from "@/components/workflow/hospital-form";
import { ReceptionSummary } from "@/components/workflow/reception-summary";
import { requirePinConfirmed } from "@/lib/auth/guards";
import type { HospitalClearanceStatus } from "@/lib/domain/types";
import { getDocumentsForEngagement } from "@/lib/services/document-service";
import {
  getEngagementDetail,
  getLatestHospitalClearance,
} from "@/lib/services/workflow-service";

export default async function HospitalDetailPage({
  params,
}: {
  params: Promise<{ engagementId: string }>;
}) {
  const { engagementId } = await params;
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("HospitalStaff")) {
    redirect("/dashboard");
  }

  const detail = await getEngagementDetail(engagementId);
  if (!detail) {
    notFound();
  }
  const { engagement, person, approvals } = detail;
  const documents = await getDocumentsForEngagement(engagementId);
  const latestClearance = await getLatestHospitalClearance(engagementId);

  const isHospitalStaff =
    session.workflowRoles.includes("HospitalStaff") &&
    session.systemRole !== "Guest";
  const readOnly =
    engagement.workflowState !== "AtHospital" || !isHospitalStaff;

  const approval = approvals[0]
    ? {
        approverName: approvals[0].approverName,
        approverRole: approvals[0].approverRole,
        approvedAt: approvals[0].approvedAt,
      }
    : undefined;

  return (
    <div>
      <PageHeader title={person.fullName} />
      <div className="flex flex-col gap-6">
        <ReceptionSummary
          person={{
            fullName: person.fullName,
            passportNo: person.passportNo,
            dateOfBirth: person.dateOfBirth,
            gender: person.gender,
            nationality: person.nationality,
            emergencyContactName: person.emergencyContactName,
            emergencyContactPhone: person.emergencyContactPhone,
          }}
          accessPurpose={engagement.accessPurpose}
          arrivalDate={engagement.arrivalDate}
          departureDate={engagement.departureDate}
          approval={approval}
        />
        <HospitalForm
          engagementId={engagementId}
          uploadedDocuments={documents}
          latestClearance={
            latestClearance
              ? {
                  clearanceStatus:
                    latestClearance.clearanceStatus as HospitalClearanceStatus,
                  doctorComments: latestClearance.doctorComments,
                  clearanceDate: latestClearance.clearanceDate,
                }
              : undefined
          }
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}
