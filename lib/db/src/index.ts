import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// node-postgres emits pool-level "error" events when an idle client is
// disconnected unexpectedly. Without a listener, EventEmitter treats that as
// an uncaught error and can terminate the API process. This does not intercept
// query promises: failures from active queries still reject to their callers.
pool.on("error", (error: Error & { code?: unknown }) => {
  console.error("[database] idle PostgreSQL pool client error", {
    errorName: error.name,
    errorCode: typeof error.code === "string" ? error.code : undefined,
  });
});

export const db = drizzle(pool, { schema });

export * from "./schema";
