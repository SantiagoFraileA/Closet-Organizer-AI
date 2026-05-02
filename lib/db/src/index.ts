import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.PG_CONNECTION_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "PG_CONNECTION_URL or DATABASE_URL must be set.",
  );
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
