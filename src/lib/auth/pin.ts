import bcrypt from "bcrypt";
import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { staffUsers } from "@/lib/db/schema";

const BCRYPT_COST = 12;
const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 15;

export function validatePin(pin: string): { valid: boolean; reason?: string } {
  if (!/^\d{4}$/.test(pin)) {
    return { valid: false, reason: "PIN must be exactly 4 digits" };
  }

  const digits = pin.split("").map(Number);

  if (digits.every((d) => d === digits[0])) {
    return { valid: false, reason: "PIN cannot be all the same digit" };
  }

  const isAscending = digits.every(
    (d, i) => i === 0 || d === digits[i - 1] + 1,
  );
  if (isAscending) {
    return { valid: false, reason: "PIN cannot be an ascending sequence" };
  }

  const isDescending = digits.every(
    (d, i) => i === 0 || d === digits[i - 1] - 1,
  );
  if (isDescending) {
    return { valid: false, reason: "PIN cannot be a descending sequence" };
  }

  const isAABB = digits[0] === digits[1] && digits[2] === digits[3];
  const isABAB = digits[0] === digits[2] && digits[1] === digits[3];
  if (isAABB || isABAB) {
    return { valid: false, reason: "PIN cannot be a repeating pattern" };
  }

  return { valid: true };
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_COST);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function isLocked(user: { pinLockedUntil: Date | null }): boolean {
  return !!user.pinLockedUntil && user.pinLockedUntil.getTime() > Date.now();
}

export async function handleFailedAttempt(
  staffUserId: string,
): Promise<{ locked: boolean; attemptsRemaining: number }> {
  const [updated] = await db
    .update(staffUsers)
    .set({ pinFailedAttempts: sql`${staffUsers.pinFailedAttempts} + 1` })
    .where(eq(staffUsers.id, staffUserId))
    .returning();

  if (updated.pinFailedAttempts >= MAX_ATTEMPTS) {
    await db
      .update(staffUsers)
      .set({
        pinFailedAttempts: 0,
        pinLockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000),
      })
      .where(eq(staffUsers.id, staffUserId));

    return { locked: true, attemptsRemaining: 0 };
  }

  return {
    locked: false,
    attemptsRemaining: MAX_ATTEMPTS - updated.pinFailedAttempts,
  };
}

export async function clearLockout(staffUserId: string): Promise<void> {
  await db
    .update(staffUsers)
    .set({ pinFailedAttempts: 0, pinLockedUntil: null })
    .where(eq(staffUsers.id, staffUserId));
}

export async function setPinHash(
  staffUserId: string,
  pinHash: string,
): Promise<void> {
  await db
    .update(staffUsers)
    .set({ pinHash })
    .where(eq(staffUsers.id, staffUserId));
}

export async function resetPin(
  staffUserId: string,
): Promise<{ id: string; email: string; displayName: string } | undefined> {
  const [user] = await db
    .update(staffUsers)
    .set({ pinHash: null, pinFailedAttempts: 0, pinLockedUntil: null })
    .where(eq(staffUsers.id, staffUserId))
    .returning();
  return user;
}
