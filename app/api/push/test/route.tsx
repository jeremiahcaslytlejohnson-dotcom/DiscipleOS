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

export async function POST() {
  try {
    const rows = await sql`
      SELECT endpoint, p256dh, auth
      FROM push_subscriptions
    `;

    const results = await Promise.allSettled(
      rows.map((row: any) =>
        webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: {
              p256dh: row.p256dh,
              auth: row.auth,
            },
          },
          JSON.stringify({
            title: "DiscipleOS",
            body: "Manual push test from saved subscription",
          })
        )
      )
    );

    const failures = results
      .map((result, index) => ({ result, row: rows[index] }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ result, row }) => ({
        endpoint: row.endpoint,
        error:
          result.status === "rejected"
            ? String(
                (result.reason as any)?.body ||
                (result.reason as any)?.message ||
                result.reason
              )
            : null,
        statusCode:
          result.status === "rejected"
            ? (result.reason as any)?.statusCode ?? null
            : null,
      }));

    return Response.json({
      success: true,
      total: rows.length,
      sent: results.filter((r) => r.status === "fulfilled").length,
      failed: results.filter((r) => r.status === "rejected").length,
      failures,
    });
  } catch (error) {
    console.error("Push test error:", error);

    return Response.json(
      { success: false },
      { status: 500 }
    );
  }
}