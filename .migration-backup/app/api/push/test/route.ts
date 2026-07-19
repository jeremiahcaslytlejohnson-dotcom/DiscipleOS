export const runtime = "nodejs";

import { neon } from "@neondatabase/serverless";
import webpush from "web-push";

function getSql() {
  const url =
    process.env.DISCIPLEOS_POSTGRES_URL ||
    process.env.discipleos_POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!url) {
    throw new Error("Missing database URL");
  }

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

async function sendTestPush(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const sql = getSql();
    configureWebPush();

    const subscriptions = await sql`
      SELECT id, endpoint, p256dh, auth
      FROM push_subscriptions
    `;

    if (!subscriptions.length) {
      return Response.json(
        {
          success: true,
          sent: 0,
          subscriptions: 0,
          message: "No saved push subscriptions found",
        },
        { status: 200 }
      );
    }

    let sent = 0;
    let failed = 0;

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
            title: "DiscipleOS Test Notification",
            body: "This is a live test push from DiscipleOS.",
            url: "/",
            tag: `discipleos-test-${Date.now()}`,
          })
        );

        sent += 1;
      } catch (error: any) {
        failed += 1;
        console.error("Test push failed:", error?.message || error);

        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await sql`
            DELETE FROM push_subscriptions
            WHERE endpoint = ${sub.endpoint}
          `;
        }
      }
    }

    return Response.json(
      {
        success: true,
        subscriptions: subscriptions.length,
        sent,
        failed,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Test push route error:", error);

    return Response.json(
      {
        success: false,
        error: error?.message || "Failed to send test push",
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return sendTestPush(req);
}

export async function POST(req: Request) {
  return sendTestPush(req);
}