import { db } from "@workspace/db";
import {
  eventsTable,
  pushSubscriptionsTable,
  sentRemindersTable,
} from "@workspace/db";
import { and, eq, gte, lte } from "drizzle-orm";
import webpush from "web-push";
import { logger } from "../lib/logger";

export type ReminderDeliverySummary = {
  eventsChecked: number;
  dueEvents: number;
  expiredSubscriptionsRemoved: number;
  failedDeliveries: number;
  sent: number;
};

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Missing VAPID configuration. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT.",
    );
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function getNowInTimeZone(timeZone: string): { today: string; nowHHMM: string } {
  try {
    const now = new Date();
    const localStr = now.toLocaleString("en-US", { timeZone });
    const local = new Date(localStr);
    const yyyy = local.getFullYear();
    const mm = String(local.getMonth() + 1).padStart(2, "0");
    const dd = String(local.getDate()).padStart(2, "0");
    const hh = String(local.getHours()).padStart(2, "0");
    const min = String(local.getMinutes()).padStart(2, "0");
    return { today: `${yyyy}-${mm}-${dd}`, nowHHMM: `${hh}:${min}` };
  } catch {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const hh = String(now.getUTCHours()).padStart(2, "0");
    const min = String(now.getUTCMinutes()).padStart(2, "0");
    return { today: `${yyyy}-${mm}-${dd}`, nowHHMM: `${hh}:${min}` };
  }
}

function isReminderDue(
  eventTime: string,
  reminderMinutes: number,
  nowHHMM: string,
): boolean {
  const [eventHours, eventMinutes] = eventTime.split(":").map(Number);
  const [nowHours, nowMinutes] = nowHHMM.split(":").map(Number);
  if (![eventHours, eventMinutes, nowHours, nowMinutes].every(Number.isFinite)) {
    return false;
  }

  const dueMinutes = eventHours * 60 + eventMinutes - reminderMinutes;
  const normalizedDueMinutes = ((dueMinutes % 1440) + 1440) % 1440;
  const currentMinutes = nowHours * 60 + nowMinutes;
  const elapsedMinutes =
    dueMinutes < 0
      ? currentMinutes + 1440 - normalizedDueMinutes
      : currentMinutes - normalizedDueMinutes;

  // Scheduled runs can start late. Keep a retry window; sent_reminders
  // prevents duplicate sends during overlapping executions.
  return elapsedMinutes >= 0 && elapsedMinutes <= 6;
}

function eventOccursOnDate(event: typeof eventsTable.$inferSelect, dateISO: string): boolean {
  if (event.date === dateISO) return true;
  if (!event.repeat || event.repeat === "none") return false;
  const eventDate = new Date(event.date + "T00:00:00Z");
  const checkDate = new Date(dateISO + "T00:00:00Z");
  if (checkDate < eventDate) return false;
  if (event.repeatUntil && dateISO > event.repeatUntil) return false;
  if (event.repeat === "daily") return true;
  if (event.repeat === "weekly") {
    const weekdays: number[] = Array.isArray(event.repeatWeekdays)
      ? event.repeatWeekdays
      : [];
    return weekdays.includes(checkDate.getUTCDay());
  }
  return false;
}

/**
 * Sends all reminders that are due now. Used by both the protected HTTP route
 * and the scheduled command, keeping delivery rules identical in each runtime.
 */
export async function sendDueReminders(): Promise<ReminderDeliverySummary> {
  configureWebPush();

  const allEvents = await db
    .select()
    .from(eventsTable)
    .where(eq(eventsTable.remind, true));
  const allSubscriptions = await db.select().from(pushSubscriptionsTable);
  const subsByUser = new Map<string, typeof allSubscriptions>();

  for (const sub of allSubscriptions) {
    const subscriptions = subsByUser.get(sub.userId) ?? [];
    subscriptions.push(sub);
    subsByUser.set(sub.userId, subscriptions);
  }

  const summary: ReminderDeliverySummary = {
    eventsChecked: allEvents.length,
    dueEvents: 0,
    expiredSubscriptionsRemoved: 0,
    failedDeliveries: 0,
    sent: 0,
  };
  const fallbackTZ = "America/New_York";

  for (const event of allEvents) {
    const timeZone = event.timeZone || fallbackTZ;
    const { today, nowHHMM } = getNowInTimeZone(timeZone);
    if (
      !event.time ||
      !eventOccursOnDate(event, today) ||
      !isReminderDue(event.time, Number(event.reminderMinutes ?? 10), nowHHMM)
    ) {
      continue;
    }

    summary.dueEvents++;
    const alreadySent = await db
      .select({ id: sentRemindersTable.id })
      .from(sentRemindersTable)
      .where(
        and(
          eq(sentRemindersTable.eventId, event.id),
          gte(sentRemindersTable.sentAt, new Date(`${today}T00:00:00Z`)),
          lte(sentRemindersTable.sentAt, new Date(`${today}T23:59:59Z`)),
        ),
      )
      .limit(1);

    if (alreadySent.length) continue;

    let sentThisEvent = 0;
    for (const subscription of subsByUser.get(event.userId) ?? []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify({
            title: event.title || "DiscipleOS Reminder",
            body: event.notes || `${event.type || "Event"} starts at ${event.time}`,
            url: "/",
            tag: `discipleos-${event.id}-${today}`,
          }),
        );
        summary.sent++;
        sentThisEvent++;
      } catch (err: any) {
        summary.failedDeliveries++;
        logger.warn(
          { statusCode: err?.statusCode, errorName: err?.name },
          "Push delivery failed",
        );
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db
            .delete(pushSubscriptionsTable)
            .where(
              and(
                eq(pushSubscriptionsTable.endpoint, subscription.endpoint),
                eq(pushSubscriptionsTable.userId, event.userId),
              ),
            );
          summary.expiredSubscriptionsRemoved++;
        }
      }
    }

    // An unsuccessful run remains eligible for the next scheduled attempt.
    if (sentThisEvent > 0) {
      await db.insert(sentRemindersTable).values({
        eventId: event.id,
        endpoint: "broadcast",
        sentAt: new Date(),
      });
    }
  }

  return summary;
}