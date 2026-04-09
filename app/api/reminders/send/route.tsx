export const runtime = "nodejs";

import webpush from "web-push";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.discipleos_POSTGRES_URL!);

const VAPID_PUBLIC_KEY =
  "BFYUizKcRaV50mWxCVk3qdRqkUhyXaB5QXeLJQe56D__bLcJClTiT4DOPw3yE4p5L0EggMdEPkNuxh5TnWqg0W0";
const VAPID_PRIVATE_KEY =
  "-_-QRMo1jBMagrIgv66_mVZBR1ywnluN7eZoFQ_GoHg";

webpush.setVapidDetails(
  "mailto:test@example.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

function combineEventDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

async function sendDueReminders() {
  const subscriptions = await sql`
    SELECT endpoint, p256dh, auth
    FROM push_subscriptions
  `;

  const events = await sql`
    SELECT
      id,
      title,
      type,
      date,
      time,
      notes,
      remind,
      reminder_minutes
    FROM events
    WHERE remind = true
  `;

  const now = new Date();

  const dueEvents = events.filter((event: any) => {
    const eventTime = combineEventDateTime(event.date, event.time);
    const reminderTime = new Date(
      eventTime.getTime() - Number(event.reminder_minutes || 0) * 60000
    );

    return now >= reminderTime && now <= new Date(reminderTime.getTime() + 60000);
  });

  let sent = 0;
  const failures: any[] = [];

  for (const event of dueEvents) {
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          JSON.stringify({
            title: event.title,
            body: event.notes || `${event.type} starts at ${event.time}`,
          })
        );
        sent += 1;
      } catch (error: any) {
        failures.push({
          endpoint: sub.endpoint,
          eventId: event.id,
          statusCode: error?.statusCode ?? null,
          error: String(error?.body || error?.message || error),
        });
      }
    }
  }

  return {
    success: true,
    dueEvents: dueEvents.length,
    subscriptions: subscriptions.length,
    sent,
    failures,
  };
}

export async function GET() {
  try {
    const result = await sendDueReminders();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send reminders error:", error);

    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function POST() {
  try {
    const result = await sendDueReminders();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send reminders error:", error);

    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}