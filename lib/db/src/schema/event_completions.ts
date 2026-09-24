import { boolean, pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const eventCompletionsTable = pgTable(
  "event_completions",
  {
    eventId: text("event_id").notNull(),
    occurrenceDate: text("occurrence_date").notNull(),
    completed: boolean("completed").notNull().default(false),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    eventOccurrencePk: primaryKey({
      columns: [table.eventId, table.occurrenceDate],
    }),
  }),
);