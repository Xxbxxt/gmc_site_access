import { eq } from "drizzle-orm";

import { type DbClient, db as defaultDb } from "@/lib/db/client";
import { persons } from "@/lib/db/schema";

export type Person = typeof persons.$inferSelect;

export type PersonInput = {
  passportNo: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  email?: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

export async function findPersonByPassport(
  passportNo: string,
  db: DbClient = defaultDb,
): Promise<Person | undefined> {
  const [person] = await db
    .select()
    .from(persons)
    .where(eq(persons.passportNo, passportNo));
  return person;
}

export async function createPerson(
  input: PersonInput,
  db: DbClient = defaultDb,
): Promise<Person> {
  const [person] = await db.insert(persons).values(input).returning();
  return person;
}

export async function updatePerson(
  personId: string,
  input: PersonInput,
  db: DbClient = defaultDb,
): Promise<Person | undefined> {
  const [person] = await db
    .update(persons)
    .set(input)
    .where(eq(persons.id, personId))
    .returning();
  return person;
}
