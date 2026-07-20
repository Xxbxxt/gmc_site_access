import { Stethoscope } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { WORKFLOW_STATE_BADGE } from "@/app/dashboard/(workflow)/reception/reception-row";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePinConfirmed } from "@/lib/auth/guards";
import type { WorkflowState } from "@/lib/domain/types";
import { listEngagementsForLayer } from "@/lib/services/workflow-service";

export default async function HospitalQueuePage() {
  const session = await requirePinConfirmed();

  if (!session.workflowRoles.includes("HospitalStaff")) {
    redirect("/dashboard");
  }

  const rows = await listEngagementsForLayer("AtHospital", ["Work"]);

  return (
    <div>
      <PageHeader
        title="Hospital"
        subtitle="Medical clearance queue for work-path visitors."
      />
      <div className="overflow-x-auto bg-card">
        {rows.length === 0 ? (
          <EmptyState
            icon={Stethoscope}
            title="No records awaiting Hospital clearance"
            description="Work-path visitors will appear here once they reach the Hospital stage."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Passport No.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ engagement, person }) => (
                <TableRow key={engagement.id}>
                  <TableCell>
                    <Link href={`/dashboard/hospital/${engagement.id}`}>
                      {person.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{person.passportNo}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        WORKFLOW_STATE_BADGE[
                          engagement.workflowState as WorkflowState
                        ]
                      }
                    >
                      {engagement.workflowState}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
