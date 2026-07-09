import { redirect } from "next/navigation";

export default function AdminPage() {
  redirect("/dashboard/system-admin/users");
}
