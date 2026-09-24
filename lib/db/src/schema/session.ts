import { index, json, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * This table is managed at runtime by connect-pg-simple. It is represented in
 * the Drizzle schema solely so schema comparisons preserve active sessions.
 */
export const sessionTable = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);