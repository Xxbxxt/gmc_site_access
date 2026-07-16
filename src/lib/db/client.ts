import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle(client, { casing: "snake_case" });

/** Either the top-level `db` or an active `db.transaction()` callback's `tx` — lets service functions accept an optional transaction without duplicating query logic. */
export type DbClient =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];
