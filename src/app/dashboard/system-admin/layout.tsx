import { redirect } from "next/navigation";

import { requireSystemAdmin } from "@/lib/auth/guards";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireSystemAdmin();
  } catch {
    redirect("/");
  }

  return <>{children}</>;
}
