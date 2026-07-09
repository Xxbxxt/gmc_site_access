import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

// Only the admin dashboard exists in Slice 1. When workflow-layer dashboards
// land (Reception, Hospital, ...), route here by the user's workflow roles.
export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  if (session.systemRole === "SystemAdmin") {
    redirect("/dashboard/system-admin/users");
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        Dashboard coming soon
      </h1>
      <p className="text-sm text-muted-foreground">
        Your workflow dashboard hasn&apos;t been built yet for this role. Check
        back once it ships.
      </p>
    </div>
  );
}
