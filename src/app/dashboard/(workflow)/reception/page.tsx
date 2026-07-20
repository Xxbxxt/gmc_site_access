import { UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ReceptionRow } from "@/app/dashboard/(workflow)/reception/reception-row";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePinConfirmed } from "@/lib/auth/guards";
import type { WorkflowState } from "@/lib/domain/types";
import { listEngagementsWithPerson } from "@/lib/services/workflow-service";

export default async function ReceptionQueuePage() {
  const session = await requirePinConfirmed();
  const canSeeQueue = (["Receptionist", "HCM", "GMM", "DMD"] as const).some(
    (role) => session.workflowRoles.includes(role),
  );

  if (!canSeeQueue) {
    redirect("/dashboard");
  }

  const canManage =
    session.systemRole !== "Guest" &&
    session.workflowRoles.includes("Receptionist");

  const rows = await listEngagementsWithPerson();
  const firstName = session.displayName?.split(" ")[0] ?? "there";

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}!`}
        subtitle="Here, you'll find existing engagements and create new ones."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/dashboard/reception/new">New Registration</Link>
            </Button>
          ) : undefined
        }
      />
      <div className="overflow-x-auto bg-card">
        {rows.length === 0 ? (
          <EmptyState
            icon={UsersRound}
            title="No engagements yet"
            description="Registered visitors and expatriates will show up here."
            action={
              canManage ? (
                <Button asChild>
                  <Link href="/dashboard/reception/new">New Registration</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Passport No.</TableHead>
                <TableHead>Access Purpose</TableHead>
                <TableHead>Status</TableHead>
                {canManage && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ engagement, person }) => (
                <ReceptionRow
                  key={engagement.id}
                  engagementId={engagement.id}
                  personName={person.fullName}
                  passportNo={person.passportNo}
                  accessPurpose={engagement.accessPurpose}
                  workflowState={engagement.workflowState as WorkflowState}
                  canManage={canManage}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
