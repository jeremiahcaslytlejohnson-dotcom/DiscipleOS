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

export async function POST(req: Request) {
  try {
    const subscription = await req.json();

    if (
      !subscription ||
      typeof subscription !== "object" ||
      typeof subscription.endpoint !== "string" ||
      typeof subscription.keys?.p256dh !== "string" ||
      typeof subscription.keys?.auth !== "string"
    ) {
      console.error("Invalid subscription payload:", subscription);

      return new Response(
        JSON.stringify({ success: false, error: "Invalid subscription" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    await sql`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth)
      VALUES (
        ${subscription.endpoint},
        ${subscription.keys.p256dh},
        ${subscription.keys.auth}
      )
      ON CONFLICT (endpoint)
      DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        updated_at = NOW()
    `;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Push subscription error:", error);

    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}