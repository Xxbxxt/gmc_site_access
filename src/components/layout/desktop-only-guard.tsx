import { MonitorX } from "lucide-react";

export function DesktopOnlyGuard() {
  return (
    <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-4 bg-background p-6 text-center max-lg:flex">
      <MonitorX className="size-12 text-muted-foreground" />
      <h1 className="text-lg font-semibold text-foreground">
        Desktop Required
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This application is optimized for desktop use only. Please switch to a
        desktop or laptop computer to continue.
      </p>
    </div>
  );
}
