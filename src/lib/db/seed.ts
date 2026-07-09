import { db } from "@/lib/db/client";
import { staffUsers } from "@/lib/db/schema";

async function seed() {
  const entraObjectId = process.env.SEED_ADMIN_ENTRA_ID;
  const email = process.env.SEED_ADMIN_EMAIL;

  if (!entraObjectId || !email) {
    throw new Error(
      "SEED_ADMIN_ENTRA_ID and SEED_ADMIN_EMAIL must be set in .env",
    );
  }

  await db
    .insert(staffUsers)
    .values({
      entraObjectId,
      email,
      displayName: email,
      systemRole: "SystemAdmin",
      workflowRoles: [],
      provisionedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: staffUsers.entraObjectId,
      set: {
        email,
        displayName: email,
        systemRole: "SystemAdmin",
        provisionedAt: new Date(),
      },
    });

  console.log(`[seed] SystemAdmin ready: ${email}`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[seed]", error);
    process.exit(1);
  });
