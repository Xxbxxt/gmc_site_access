import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ReceptionForm } from "@/components/workflow/reception-form";
import { requireWriteAccess } from "@/lib/auth/guards";

export default async function NewReceptionPage() {
  try {
    await requireWriteAccess("Receptionist");
  } catch {
    redirect("/dashboard/reception");
  }

  return (
    <div>
      <PageHeader
        title="New Registration"
        subtitle="Look up an existing visitor by passport number, or register a new one."
      />
      <ReceptionForm allowLookup />
    </div>
  );
}
