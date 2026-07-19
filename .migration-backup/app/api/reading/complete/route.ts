export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { neon } from "@neondatabase/serverless";

function getSql() {
  const url =
    process.env.DISCIPLEOS_POSTGRES_URL ||
    process.env.discipleos_POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!url) throw new Error("Missing database URL");
  return neon(url);
}

export async function POST(req: Request) {
  try {
    const sql = getSql();
    const { planId, key, completed } = await req.json();

    if (!planId || !key) {
      return Response.json(
        { success: false, error: "Missing planId or key" },
        { status: 400 }
      );
    }

    const value = Boolean(completed);

    await sql`
      UPDATE reading_plans
      SET
        completed = jsonb_set(
          COALESCE(completed, '{}'::jsonb),
          ARRAY[${key}],
          ${JSON.stringify(value)}::jsonb,
          true
        ),
        updated_at = NOW()
      WHERE id = ${planId}
    `;

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("Reading complete error:", error);

    return Response.json(
      { success: false, error: error?.message || "Failed" },
      { status: 500 }
    );
  }
}