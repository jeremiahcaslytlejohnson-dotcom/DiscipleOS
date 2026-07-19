import { pgTable, text, boolean, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const eventsTable = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull().default(""),
  notes: text("notes").notNull().default(""),
  remind: boolean("remind").notNull().default(false),
  reminderMinutes: integer("reminder_minutes").notNull().default(10),
  repeat: text("repeat").notNull().default("none"),
  repeatWeekdays: jsonb("repeat_weekdays").notNull().default([]),
  repeatUntil: text("repeat_until"),
  timeZone: text("time_zone").notNull().default("America/New_York"),
  updatedAt: timestamp("updated_at").defaultNow(),
});
