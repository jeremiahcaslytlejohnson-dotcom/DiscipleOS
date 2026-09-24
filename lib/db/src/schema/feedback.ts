import { sql } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const feedbackTable = pgTable(
  "feedback",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id"),
    category: text("category").notNull().default("feedback"),
    message: text("message").notNull(),
    page: text("page"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    // Nullable so rows created before notification tracking are never retried
    // blindly and risk sending a duplicate owner notification.
    notificationStatus: varchar("notification_status"),
    notificationAttempts: integer("notification_attempts").notNull().default(0),
    notificationLastAttemptAt: timestamp("notification_last_attempt_at", {
      withTimezone: true,
    }),
    notificationLastError: text("notification_last_error"),
    notificationSentAt: timestamp("notification_sent_at", { withTimezone: true }),
  },
  (table) => [
    index("feedback_created_at_idx").on(table.createdAt),
    index("feedback_notification_status_idx").on(table.notificationStatus),
  ],
);

export type Feedback = typeof feedbackTable.$inferSelect;
export type NewFeedback = typeof feedbackTable.$inferInsert;