"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { cancelEngagementAction } from "@/actions/engagements";
import { Button } from "@/components/ui/button";

export function CancelEngagementButton({
  engagementId,
}: {
  engagementId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    const confirmed = window.confirm(
      "Cancel this engagement? It will be removed from the active queue and can no longer be acted on.",
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await cancelEngagementAction(engagementId);
      if (result.success) {
        toast.success("Engagement cancelled");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Button variant="destructive" loading={isPending} onClick={handleCancel}>
      Cancel Engagement
    </Button>
  );
}
