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

function normalizeDate(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value as string | number | Date).toISOString().slice(0, 10);
}

function eventOccursOnDate(event: any, dateISO: string) {
  const eventDate = normalizeDate(event.date);
  const repeatUntil = normalizeDate(event.repeat_until);

  if (!event.repeat || event.repeat === "none") {
    return eventDate === dateISO;
  }

  if (dateISO < eventDate) return false;
  if (repeatUntil && dateISO > repeatUntil) return false;

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

async function sendExpoPush(token: string, title: string, body: string) {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: token,
      title,
      body,
      sound: "default",
      data: {
        url: "/",
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Expo push failed with status ${response.status}`);
  }

  return response.json();
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

    const subscriptions = await sql`
  SELECT id, endpoint, p256dh, auth
  FROM push_subscriptions
`;

const mobileTokens = await sql`
  SELECT token
  FROM mobile_push_tokens
`;

if (!subscriptions.length && !mobileTokens.length) {
  return Response.json({
    success: true,
    sent: 0,
    message: "No subscriptions",
  });
}
	
	
	
	const dueEvents = events.filter((event: any) => {
	const tz = event.time_zone || fallbackTZ;
	const { today, nowHHMM } = getNowInTimeZone(tz);

	if (!event.time) return false;
	if (!eventOccursOnDate(event, today)) return false;

	const reminderMinutes = Number(event.reminder_minutes ?? 10);
	const dueTime = subtractMinutes(event.time, reminderMinutes);
	const windowStart = subtractMinutes(nowHHMM, 2);

	return dueTime >= windowStart && dueTime <= nowHHMM;
	});

    let sentCount = 0;

    for (const event of dueEvents) {
  const tz = event.time_zone || fallbackTZ;
  const { today } = getNowInTimeZone(tz);

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

for (const mobile of mobileTokens) {
  try {
    await sendExpoPush(
      mobile.token,
      event.title || "DiscipleOS Reminder",
      event.notes || `${event.type || "Event"} starts at ${event.time}`
    );

    sentCount++;
  } catch (error: any) {
    console.error("Expo push failed:", error?.message || error);
  }
}

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