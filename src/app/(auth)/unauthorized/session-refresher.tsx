"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { refreshSessionAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export function SessionRefresher({ next }: { next: string }) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    refreshSessionAction().then((result) => {
      if (result.success) {
        router.push(next);
      } else {
        toast.error("Couldn't refresh your session", {
          description: result.error,
        });
        setFailed(true);
      }
    });
  }, [next, router]);

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
        <p>We could not refresh your session automatically.</p>
        <Button onClick={() => router.refresh()}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      Redirecting…
    </div>
  );
}
