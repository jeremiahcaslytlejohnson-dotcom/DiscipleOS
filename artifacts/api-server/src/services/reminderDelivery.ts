import { db } from "@workspace/db";
import {
  eventsTable,
  pushSubscriptionsTable,
  sentRemindersTable,
} from "@workspace/db";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import webpush from "web-push";
import { logger } from "../lib/logger";

export type ReminderDeliverySummary = {
  invocationId: string;
  source: "scheduled" | "api";
  eventsChecked: number;
  candidateEventsEvaluated: number;
  notSelectedCandidates: number;
  dueEvents: number;
  dueEventsWithoutSubscriptions: number;
  subscriptionsTargeted: number;
  deliveryAttempts: number;
  alreadySentSkips: number;
  expiredSubscriptionsRemoved: number;
  failedDeliveries: number;
  processingErrors: number;
  deliveryRecordErrors: number;
  sent: number;
};

type ReminderRunOptions = {
  invocationId?: string;
  source?: "scheduled" | "api";
  now?: Date;
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

function getPartsInTimeZone(
  date: Date,
  timeZone: string,
): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
}

function getNowInTimeZone(timeZone: string, now: Date): {
  today: string;
  nowHHMM: string;
  timeZone: string;
} {
  try {
    const parts = getPartsInTimeZone(now, timeZone);
    return {
      today: `${parts.year}-${parts.month}-${parts.day}`,
      nowHHMM: `${parts.hour}:${parts.minute}`,
      timeZone,
    };
  } catch {
    const parts = getPartsInTimeZone(now, "UTC");
    return {
      today: `${parts.year}-${parts.month}-${parts.day}`,
      nowHHMM: `${parts.hour}:${parts.minute}`,
      timeZone: "UTC",
    };
  }
}

function shiftDateISO(dateISO: string, days: number): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

function nextDateISO(dateISO: string): string {
  return shiftDateISO(dateISO, 1);
}

function dayOrdinal(dateISO: string): number | null {
  const [year, month, day] = dateISO.split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function startOfLocalDayUtc(dateISO: string, timeZone: string): Date {
  const [year, month, day] = dateISO.split("-").map(Number);
  const desiredUtcFields = Date.UTC(year, month - 1, day);
  let candidate = desiredUtcFields;

  // Convert local midnight to UTC by correcting the candidate against the
  // IANA-zone wall clock. Iteration accounts for the offset at that date,
  // including daylight-saving changes.
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = getPartsInTimeZone(new Date(candidate), timeZone);
    const representedUtcFields = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const correction = desiredUtcFields - representedUtcFields;
    if (correction === 0) return new Date(candidate);
    candidate += correction;
  }

  return new Date(candidate);
}

function localDayBounds(dateISO: string, timeZone: string) {
  return {
    start: startOfLocalDayUtc(dateISO, timeZone),
    end: startOfLocalDayUtc(nextDateISO(dateISO), timeZone),
  };
}

function reminderDueTime(eventTime: string, reminderMinutes: number): string | null {
  const [hours, minutes] = eventTime.split(":").map(Number);
  if (![hours, minutes, reminderMinutes].every(Number.isFinite)) return null;

  const totalMinutes = ((hours * 60 + minutes - reminderMinutes) % 1440 + 1440) % 1440;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

export function reminderDueDateISO(
  occurrenceDate: string,
  eventTime: string,
  reminderMinutes: number,
): string | null {
  const occurrenceDay = dayOrdinal(occurrenceDate);
  const [hours, minutes] = eventTime.split(":").map(Number);
  if (
    occurrenceDay === null ||
    ![hours, minutes, reminderMinutes].every(Number.isFinite)
  ) {
    return null;
  }

  const dueDay = Math.floor(
    (occurrenceDay * 1440 + hours * 60 + minutes - reminderMinutes) / 1440,
  );
  return shiftDateISO("1970-01-01", dueDay);
}

function safeErrorFields(error: unknown) {
  const candidate = error as {
    name?: unknown;
    statusCode?: unknown;
  } | null;
  return {
    errorName:
      typeof candidate?.name === "string" ? candidate.name : "UnknownError",
    statusCode:
      typeof candidate?.statusCode === "number"
        ? candidate.statusCode
        : undefined,
  };
}

function diagnosticKey(scope: string, value: string): string {
  const digest = createHash("sha256")
    .update(`${scope}:${value}`)
    .digest("hex")
    .slice(0, 16);
  return `${scope}_${digest}`;
}

function eventDiagnosticKey(eventId: string): string {
  return diagnosticKey("event", eventId);
}

function deviceDiagnosticKey(
  subscription: (typeof pushSubscriptionsTable.$inferSelect),
): string {
  const identity = subscription.deviceId
    ? `device:${subscription.deviceId}`
    : `subscription:${subscription.id}`;
  return diagnosticKey("device", `${subscription.userId}:${identity}`);
}

function minutesSinceReminderDue(
  eventTime: string,
  reminderMinutes: number,
  occurrenceDate: string,
  today: string,
  nowHHMM: string,
): number | null {
  const dueDate = reminderDueDateISO(
    occurrenceDate,
    eventTime,
    reminderMinutes,
  );
  const dueDay = dueDate ? dayOrdinal(dueDate) : null;
  const todayDay = dayOrdinal(today);
  const [eventHours, eventMinutes] = eventTime.split(":").map(Number);
  const [nowHours, nowMinutes] = nowHHMM.split(":").map(Number);
  if (
    dueDay === null ||
    todayDay === null ||
    ![eventHours, eventMinutes, reminderMinutes, nowHours, nowMinutes].every(
      Number.isFinite,
    )
  ) {
    return null;
  }

  const dueMinuteOfDay =
    ((eventHours * 60 + eventMinutes - reminderMinutes) % 1440 + 1440) %
    1440;
  const nowMinuteOfDay = nowHours * 60 + nowMinutes;
  return (todayDay - dueDay) * 1440 + nowMinuteOfDay - dueMinuteOfDay;
}

export function isReminderDue(
  eventTime: string,
  reminderMinutes: number,
  occurrenceDate: string,
  today: string,
  nowHHMM: string,
): boolean {
  const elapsedMinutes = minutesSinceReminderDue(
    eventTime,
    reminderMinutes,
    occurrenceDate,
    today,
    nowHHMM,
  );

  // Allow the due minute and one subsequent scheduler tick, but never send
  // more than one minute late. sent_reminders suppresses overlapping runs.
  return elapsedMinutes !== null && elapsedMinutes >= 0 && elapsedMinutes <= 1;
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
export async function sendDueReminders(
  options: ReminderRunOptions = {},
): Promise<ReminderDeliverySummary> {
  const invocationId = options.invocationId ?? randomUUID();
  const source = options.source ?? "api";
  const runNow = options.now ?? new Date();
  logger.info(
    {
      event: "reminder_run_started",
      invocationId,
      source,
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      vapidConfigured: Boolean(
        process.env.VAPID_PUBLIC_KEY &&
          process.env.VAPID_PRIVATE_KEY &&
          process.env.VAPID_SUBJECT,
      ),
    },
    "Reminder run started",
  );

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
    invocationId,
    source,
    eventsChecked: allEvents.length,
    candidateEventsEvaluated: 0,
    notSelectedCandidates: 0,
    dueEvents: 0,
    dueEventsWithoutSubscriptions: 0,
    subscriptionsTargeted: 0,
    deliveryAttempts: 0,
    alreadySentSkips: 0,
    expiredSubscriptionsRemoved: 0,
    failedDeliveries: 0,
    processingErrors: 0,
    deliveryRecordErrors: 0,
    sent: 0,
  };
  const fallbackTZ = "America/New_York";

  for (const event of allEvents) {
    const normalizedType = event.type.trim().toLowerCase();
    if (normalizedType === "birthday" || normalizedType === "birthdays") {
      // Older rows can remain in the database even though birthdays are no
      // longer exposed as activities by the client.
      continue;
    }

    const requestedTimeZone = event.timeZone || fallbackTZ;
    const { today, nowHHMM, timeZone } = getNowInTimeZone(requestedTimeZone, runNow);
    const reminderMinutes = Number(event.reminderMinutes ?? 10);
    if (!event.time) {
      continue;
    }

    const eventKey = eventDiagnosticKey(event.id);
    const dueOccurrenceDate =
      [today, nextDateISO(today)].find(
        (occurrenceDate) =>
          reminderDueDateISO(
            occurrenceDate,
            event.time!,
            reminderMinutes,
          ) === today,
      ) ?? null;
    const occursOnDueOccurrence =
      dueOccurrenceDate !== null &&
      eventOccursOnDate(event, dueOccurrenceDate);
    const elapsedMinutesSinceDue = dueOccurrenceDate
      ? minutesSinceReminderDue(
          event.time,
          reminderMinutes,
          dueOccurrenceDate,
          today,
          nowHHMM,
        )
      : null;
    const dueNow = isReminderDue(
      event.time,
      reminderMinutes,
      dueOccurrenceDate ?? today,
      today,
      nowHHMM,
    ) &&
      dueOccurrenceDate !== null &&
      occursOnDueOccurrence;
    const nearDueWindow =
      elapsedMinutesSinceDue !== null &&
      elapsedMinutesSinceDue >= -1 &&
      elapsedMinutesSinceDue <= 2;

    if (!dueNow) {
      if (nearDueWindow) {
        summary.candidateEventsEvaluated++;
        summary.notSelectedCandidates++;
        logger.info(
          {
            event: "reminder_event_not_selected",
            invocationId,
            source,
            eventKey,
            occurrenceDate: dueOccurrenceDate,
            eventTime: event.time,
            dueTimeLocal: reminderDueTime(event.time, reminderMinutes),
            timeZone,
            currentTimeLocal: nowHHMM,
            reason: !occursOnDueOccurrence
              ? "not_scheduled_on_local_date"
              : elapsedMinutesSinceDue !== null &&
                  elapsedMinutesSinceDue < 0
                ? "due_in_future"
                : "retry_window_expired",
          },
          "Near-due reminder was not selected",
        );
      }
      continue;
    }

    if (nearDueWindow) {
      summary.candidateEventsEvaluated++;
    }
    summary.dueEvents++;
    const targetSubscriptions = subsByUser.get(event.userId) ?? [];
    summary.subscriptionsTargeted += targetSubscriptions.length;
    if (targetSubscriptions.length === 0) {
      summary.dueEventsWithoutSubscriptions++;
    }
    logger.info(
      {
        event: "reminder_event_selected",
        invocationId,
        source,
        eventKey,
        occurrenceDate: dueOccurrenceDate,
        eventTime: event.time,
        dueTimeLocal: reminderDueTime(event.time, reminderMinutes),
        timeZone,
        subscriptionsTargeted: targetSubscriptions.length,
      },
      "Due reminder selected",
    );

    const occurrenceDate = dueOccurrenceDate!;
    const dayBounds = localDayBounds(today, timeZone);
    for (const subscription of targetSubscriptions) {
      const deviceKey = deviceDiagnosticKey(subscription);
      let deliveryAttempted = false;
      let providerStatusCode: number | undefined;
      let outcome:
        | {
            kind: "sent";
            statusCode?: number;
          }
        | {
            kind: "duplicate";
          }
        | {
            kind: "failed";
            statusCode?: number;
            errorName: string;
            subscriptionRemoved: boolean;
          }
        | {
            kind: "processing_error" | "recording_error";
            errorName: string;
            providerStatusCode?: number;
          };

      const lockKey = `discipleos-reminder:${event.id}:${subscription.id}:${today}`;
      try {
        outcome = await db.transaction(async (tx) => {
          // Prevent overlapping minute-runs from sending the same
          // event/device/occurrence concurrently.
          await tx.execute(
            sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`,
          );

          const alreadySent = await tx
            .select({ id: sentRemindersTable.id })
            .from(sentRemindersTable)
            .where(
              and(
                eq(sentRemindersTable.eventId, event.id),
                eq(sentRemindersTable.endpoint, subscription.endpoint),
                gte(sentRemindersTable.sentAt, dayBounds.start),
                lt(sentRemindersTable.sentAt, dayBounds.end),
              ),
            )
            .limit(1);

          if (alreadySent.length) return { kind: "duplicate" as const };

          deliveryAttempted = true;
          summary.deliveryAttempts++;
          logger.info(
            {
              event: "reminder_delivery_attempt_started",
              invocationId,
              source,
              eventKey,
              occurrenceDate,
              deviceKey,
            },
            "Push delivery attempt started",
          );
          let response;
          try {
            response = await webpush.sendNotification(
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
                tag: `discipleos-${event.id}-${occurrenceDate}`,
              }),
            );
            providerStatusCode = response.statusCode;
          } catch (error) {
            const failure = safeErrorFields(error);
            const expired =
              failure.statusCode === 404 || failure.statusCode === 410;
            let subscriptionRemoved = false;

            if (expired) {
              const removed = await tx
                .delete(pushSubscriptionsTable)
                .where(
                  and(
                    eq(pushSubscriptionsTable.id, subscription.id),
                    eq(pushSubscriptionsTable.userId, event.userId),
                  ),
                )
                .returning({ id: pushSubscriptionsTable.id });
              subscriptionRemoved = removed.length > 0;
            }

            return {
              kind: "failed" as const,
              statusCode: failure.statusCode,
              errorName: failure.errorName,
              subscriptionRemoved,
            };
          }

          await tx.insert(sentRemindersTable).values({
            eventId: event.id,
            endpoint: subscription.endpoint,
            sentAt: new Date(),
          });

          return {
            kind: "sent" as const,
            statusCode: response.statusCode,
          };
        });
      } catch (error) {
        const failure = safeErrorFields(error);
        outcome = {
          kind: deliveryAttempted ? "recording_error" : "processing_error",
          errorName: failure.errorName,
          providerStatusCode,
        };
      }

      if (outcome.kind === "duplicate") {
        summary.alreadySentSkips++;
        logger.info(
          {
            event: "reminder_delivery_outcome",
            invocationId,
            source,
            eventKey,
            occurrenceDate,
            deviceKey,
            outcome: "skipped_duplicate",
            providerAccepted: null,
          },
          "Reminder delivery skipped",
        );
        continue;
      }

      if (outcome.kind === "sent") {
        summary.sent++;
        logger.info(
          {
            event: "reminder_delivery_outcome",
            invocationId,
            source,
            eventKey,
            occurrenceDate,
            deviceKey,
            outcome: "provider_accepted",
            providerAccepted: true,
            providerStatusCode: outcome.statusCode ?? null,
          },
          "Push provider accepted delivery request",
        );
        continue;
      }

      if (outcome.kind === "failed") {
        summary.failedDeliveries++;
        if (outcome.subscriptionRemoved) {
          summary.expiredSubscriptionsRemoved++;
        }
        logger.warn(
          {
            event: "reminder_delivery_outcome",
            invocationId,
            source,
            eventKey,
            occurrenceDate,
            deviceKey,
            outcome: "failure",
            providerAccepted:
              outcome.statusCode === undefined
                ? null
                : outcome.statusCode >= 200 && outcome.statusCode < 300,
            providerStatusCode: outcome.statusCode ?? null,
            errorName: outcome.errorName,
            subscriptionRemoved: outcome.subscriptionRemoved,
          },
          "Reminder delivery failed",
        );
        continue;
      }

      if (outcome.kind === "recording_error") {
        summary.deliveryRecordErrors++;
      } else {
        summary.processingErrors++;
      }
      logger.error(
        {
          event: "reminder_delivery_outcome",
          invocationId,
          source,
          eventKey,
          occurrenceDate,
          deviceKey,
          outcome:
            outcome.kind === "recording_error"
              ? "recording_error_after_attempt"
              : "processing_error_before_attempt",
          providerAccepted:
            providerStatusCode === undefined
              ? null
              : providerStatusCode >= 200 && providerStatusCode < 300,
          providerStatusCode: outcome.providerStatusCode ?? null,
          errorName: outcome.errorName,
        },
        "Reminder delivery processing failed",
      );
    }
  }

  logger.info(
    {
      event: "reminder_run_completed",
      ...summary,
    },
    "Reminder run completed",
  );

  return summary;
}