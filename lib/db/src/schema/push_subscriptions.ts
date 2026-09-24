import { pgTable, text, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const pushSubscriptionsTable = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().default(""),
    deviceId: text("device_id"),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("push_subscriptions_user_device_unique").on(
      table.userId,
      table.deviceId,
    ),
  ],
);
