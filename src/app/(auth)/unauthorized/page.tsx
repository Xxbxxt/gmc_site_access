import { redirect } from "next/navigation";

import { RequestAccessForm } from "@/app/(auth)/unauthorized/request-access-form";
import { SessionRefresher } from "@/app/(auth)/unauthorized/session-refresher";
import { getSession } from "@/lib/auth/session";
import {
  findPendingAccessRequest,
  getStaffUserById,
} from "@/lib/services/auth-service";

export default async function UnauthorizedPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  if (session.systemRole !== "User") {
    redirect("/");
  }

  const user = await getStaffUserById(session.staffUserId);

  if (user && user.systemRole !== "User") {
    return <SessionRefresher next={user.pinHash ? "/pin" : "/pin/setup"} />;
  }

  const pendingRequest = user
    ? await findPendingAccessRequest(user.id)
    : undefined;

  return (
    <>
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-foreground">
          Access required
        </h1>
        <p className="max-w-md text-lg leading-8 text-muted-foreground">
          Your account isn&apos;t provisioned yet. Request access below and a
          System Administrator will review it.
        </p>
      </div>
      {pendingRequest ? (
        <p className="text-sm text-muted-foreground">
          Your request is pending.
        </p>
      ) : (
        <RequestAccessForm />
      )}
    </>
  );
}
