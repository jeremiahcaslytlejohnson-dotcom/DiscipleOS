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

export async function POST() {
  try {
    const sql = getSql();
    configureWebPush();

    const rows = await sql`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    if (!rows.length) {
      return Response.json({ success: false, error: "No subscriptions" }, { status: 404 });
    }

    const sub = rows[0];

    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      } as any,
      JSON.stringify({
        title: "DiscipleOS Test",
        body: "Push notifications are working.",
        url: "/",
      })
    );

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("Push test error:", error);

    return Response.json(
      { success: false, error: error?.message || "Failed" },
      { status: 500 }
    );
  }
}