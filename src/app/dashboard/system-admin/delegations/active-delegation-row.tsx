"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { revokeDelegatedApprovalAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

type ActiveDelegationRowProps = {
  engagementId: string;
  personName: string;
  delegatedApproverName: string;
  grantedAt: Date;
  reason: string;
};

export function ActiveDelegationRow({
  engagementId,
  personName,
  delegatedApproverName,
  grantedAt,
  reason,
}: ActiveDelegationRowProps) {
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeDelegatedApprovalAction(engagementId);
      if (result.success) {
        toast.success("Delegated approval revoked");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <TableRow>
      <TableCell>{personName}</TableCell>
      <TableCell>{delegatedApproverName}</TableCell>
      <TableCell>{grantedAt.toLocaleString()}</TableCell>
      <TableCell>{reason}</TableCell>
      <TableCell className="text-right">
        <Button
          variant="destructive"
          size="sm"
          loading={isPending}
          onClick={handleRevoke}
        >
          Revoke
        </Button>
      </TableCell>
    </TableRow>
  );
}
