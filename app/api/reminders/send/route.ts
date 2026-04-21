export const runtime = "nodejs";

import { neon } from "@neondatabase/serverless";
import webpush from "web-push";

function getSql() {
  const url =
    process.env.DISCIPLEOS_POSTGRES_URL ||
    process.env.discipleos_POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!url) throw new Error("Missing database URL");
  return neon(url);
}

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error("Missing VAPID env vars");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function getEasternNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" })
  );
}

function getNowInTimeZone(timeZone: string) {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone })
  );

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  return {
    today: `${yyyy}-${mm}-${dd}`,
    nowHHMM: `${hh}:${min}`,
  };
}

function getWeekdayIndex(dateISO: string) {
  return new Date(`${dateISO}T12:00:00`).getDay();
}

function normalizeWeekdays(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number).filter((n) => n >= 0 && n <= 6);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map(Number).filter((n) => n >= 0 && n <= 6)
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function eventOccursOnDate(event: any, dateISO: string) {
  if (!event.repeat || event.repeat === "none") {
    return event.date === dateISO;
  }

  if (dateISO < event.date) return false;
  if (event.repeat_until && dateISO > event.repeat_until) return false;

  if (event.repeat === "daily") return true;

  if (event.repeat === "weekly") {
    const weekdays = normalizeWeekdays(event.repeat_weekdays);
    return weekdays.includes(getWeekdayIndex(dateISO));
  }

  return false;
}

function subtractMinutes(time: string, minutesToSubtract: number) {
  const [hours, minutes] = time.split(":").map(Number);
  const total = hours * 60 + minutes - minutesToSubtract;
  const normalized = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(normalized / 60)).padStart(2, "0");
  const mm = String(normalized % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const sql = getSql();
    configureWebPush();

   const events = await sql`
      SELECT
        id,
        title,
        type,
        date,
        time,
        notes,
        remind,
        reminder_minutes,
        repeat,
        repeat_weekdays,
        repeat_until,
		time_zone
      FROM events
      WHERE remind = true
    `;

 const fallbackTZ = "America/New_York";

	// for now just use first event's timezone or fallback
	const tz = events[0]?.time_zone || fallbackTZ;
	const { today, nowHHMM } = getNowInTimeZone(tz);

    const subscriptions = await sql`
      SELECT id, endpoint, p256dh, auth
      FROM push_subscriptions
    `;

    if (!subscriptions.length) {
      return Response.json({
        success: true,
        sent: 0,
        message: "No subscriptions",
      });
    }
	
    const eventDiagnostics = events.map((event: any) => {
      const hasTime = Boolean(event.time);
      const occursToday = eventOccursOnDate(event, today);
      const reminderMinutes = Number(event.reminder_minutes ?? 10);
      const dueTime = event.time
        ? subtractMinutes(event.time, reminderMinutes)
        : null;
      const windowStart = subtractMinutes(nowHHMM, 2);
      const inWindow = dueTime !== null
	  ? dueTime >= windowStart && dueTime <= nowHHMM
      : false;

      return {
        id: String(event.id),
        title: event.title,
        rawDate: event.date,
        time: event.time,
        hasTime,
        occursToday,
        reminderMinutes,
        dueTime,
        windowStart,
        nowHHMM,
        inWindow,
      };
    });

    const dueEvents = events.filter((event: any) => {
      if (!event.time) return false;
      if (!eventOccursOnDate(event, today)) return false;

      const reminderMinutes = Number(event.reminder_minutes ?? 10);
      const dueTime = subtractMinutes(event.time, reminderMinutes);
      const windowStart = subtractMinutes(nowHHMM, 2);

      return dueTime >= windowStart && dueTime <= nowHHMM;
    });

    let sentCount = 0;

    for (const event of dueEvents) {
      const alreadySent = await sql`
        SELECT id
        FROM sent_reminders
        WHERE event_id = ${String(event.id)}
          AND sent_at::date = ${today}
        LIMIT 1
      `;

      if (alreadySent.length) continue;

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            } as any,
            JSON.stringify({
              title: event.title || "DiscipleOS Reminder",
              body:
                event.notes ||
                `${event.type || "Event"} starts at ${event.time}`,
              url: "/",
              tag: `discipleos-${String(event.id)}-${today}`,
            })
          );

          sentCount++;
        } catch (error: any) {
          console.error("Push send failed:", error?.message || error);

          if (error?.statusCode === 404 || error?.statusCode === 410) {
            await sql`
              DELETE FROM push_subscriptions
              WHERE endpoint = ${sub.endpoint}
            `;
          }
        }
      }

      await sql`
        INSERT INTO sent_reminders (event_id, endpoint, sent_at)
        VALUES (${String(event.id)}, ${"broadcast"}, NOW())
      `;
    }

    return Response.json({
  success: true,
  marker: "SEND_ROUTE_LIVE_CHECK",
  today,
  nowHHMM,
  timeZoneUsed: tz,
  totalEvents: events.length,
  totalSubscriptions: subscriptions.length,
  dueEventsCount: dueEvents.length,
  dueEvents: dueEvents.map((event: any) => ({
    id: String(event.id),
    title: event.title,
    date: event.date,
    time: event.time,
    remind: event.remind,
    reminderMinutes: Number(event.reminder_minutes ?? 10),
    dueTime: event.time
      ? subtractMinutes(event.time, Number(event.reminder_minutes ?? 10))
      : null,
  })),
  eventDiagnostics,
  sent: sentCount,
});
  } catch (error: any) {
    console.error("Reminder send error:", error);

    return Response.json(
      {
        success: false,
        error: error?.message || "Failed",
      },
      { status: 500 }
    );
  }
}