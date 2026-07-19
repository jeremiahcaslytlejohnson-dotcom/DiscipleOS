export const runtime = "nodejs";

import { neon } from "@neondatabase/serverless";

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

export async function POST(req: Request) {
  try {
    const sql = getSql();
    const sub = await req.json();

    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return Response.json(
        { success: false, error: "Invalid subscription" },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO push_subscriptions (
        endpoint,
        p256dh,
        auth
      )
      VALUES (
        ${sub.endpoint},
        ${sub.keys.p256dh},
        ${sub.keys.auth}
      )
      ON CONFLICT (endpoint)
      DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        updated_at = NOW()
    `;

    return Response.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Push save error:", error);

    return Response.json(
      {
        success: false,
        error: error?.message || "Failed to save subscription",
      },
      { status: 500 }
    );
  }
}