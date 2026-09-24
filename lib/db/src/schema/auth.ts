import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

// Anonymous and authenticated app sessions are both owned by DiscipleOS.
export const sessionsTable = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_sessions_expire").on(table.expire)],
);

export const usersTable = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UpsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;

export const authEmailCodesTable = pgTable(
  "auth_email_codes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    email: varchar("email").notNull(),
    purpose: varchar("purpose").notNull(),
    codeHash: varchar("code_hash").notNull(),
    codeSalt: varchar("code_salt").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    requestIp: varchar("request_ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("auth_email_codes_lookup_idx").on(
      table.email,
      table.purpose,
      table.createdAt,
    ),
    index("auth_email_codes_ip_idx").on(table.requestIp, table.createdAt),
  ],
);

/**
 * Keeps a durable record of the old provider identity and the local owner ID.
 * The runtime no longer depends on Clerk, but this bridge prevents a future
 * import or support migration from guessing ownership from email alone.
 */
export const legacyAuthIdentitiesTable = pgTable(
  "legacy_auth_identities",
  {
    provider: varchar("provider").notNull(),
    providerUserId: varchar("provider_user_id").notNull(),
    userId: varchar("user_id").notNull(),
    migratedAt: timestamp("migrated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.provider, table.providerUserId],
      name: "legacy_auth_identities_pk",
    }),
    index("legacy_auth_identities_user_idx").on(table.userId),
  ],
);