export const runtime = "nodejs";

import { neon } from "@neondatabase/serverless";

function getDatabaseUrl() {
  return (
    process.env.DISCIPLEOS_POSTGRES_URL ||
    process.env.discipleos_POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    ""
  );
}

const sql = neon(getDatabaseUrl());

export async function POST(req: Request) {
  try {
    const { token, platform = "android" } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
      });
    }

    await sql`
      INSERT INTO mobile_push_tokens (token, platform, updated_at)
      VALUES (${token}, ${platform}, NOW())
      ON CONFLICT (token)
      DO UPDATE SET updated_at = NOW()
    `;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
  } catch (error) {
    console.error("MOBILE REGISTER ERROR:", error);

    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
    });
  }
}