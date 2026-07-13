import { eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { persons } from "@/lib/db/schema";

export type Person = typeof persons.$inferSelect;

export type PersonInput = {
  passportNo: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  email: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

export async function findPersonByPassport(
  passportNo: string,
): Promise<Person | undefined> {
  const [person] = await db
    .select()
    .from(persons)
    .where(eq(persons.passportNo, passportNo));
  return person;
}

export async function createPerson(input: PersonInput): Promise<Person> {
  const [person] = await db.insert(persons).values(input).returning();
  return person;
}

export async function updatePerson(
  personId: string,
  input: PersonInput,
): Promise<Person | undefined> {
  const [person] = await db
    .update(persons)
    .set(input)
    .where(eq(persons.id, personId))
    .returning();
  return person;
}
