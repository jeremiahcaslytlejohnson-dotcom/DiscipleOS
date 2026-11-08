import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const analyticsRateLimitsTable = pgTable(
  "analytics_rate_limits",
  {
    clientIp: text("client_ip").primaryKey(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
    }).notNull(),
    requestCount: integer("request_count").notNull(),
  },
  (table) => [
    index("analytics_rate_limits_window_started_at_idx").on(
      table.windowStartedAt,
    ),
  ],
);
