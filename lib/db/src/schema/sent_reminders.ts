import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const sentRemindersTable = pgTable("sent_reminders", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull(),
  endpoint: text("endpoint").notNull().default("broadcast"),
  sentAt: timestamp("sent_at").defaultNow(),
});
