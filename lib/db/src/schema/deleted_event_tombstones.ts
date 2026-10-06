import { createInsertSchema } from "drizzle-zod";
import { index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const deletedEventTombstonesTable = pgTable(
  "deleted_event_tombstones",
  {
    eventId: text("event_id").notNull(),
    userId: text("user_id").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.eventId, table.userId],
      name: "deleted_event_tombstones_pk",
    }),
    index("deleted_event_tombstones_user_idx").on(table.userId),
  ],
);

export const insertDeletedEventTombstoneSchema = createInsertSchema(
  deletedEventTombstonesTable,
).omit({ deletedAt: true });

export type InsertDeletedEventTombstone = z.infer<
  typeof insertDeletedEventTombstoneSchema
>;
export type DeletedEventTombstone =
  typeof deletedEventTombstonesTable.$inferSelect;
