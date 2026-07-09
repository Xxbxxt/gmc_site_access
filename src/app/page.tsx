import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }
  if (session.systemRole === "User") {
    redirect("/unauthorized");
  }
  if (!session.pinConfirmed) {
    redirect(session.hasPinSet ? "/pin" : "/pin/setup");
  }
  redirect("/dashboard");
}
