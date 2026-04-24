export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function getSql() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("Missing database URL");
  }

  return neon(databaseUrl);
}

function normalizeDate(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value as string | number | Date).toISOString().slice(0, 10);
}

function todayInTimeZone(timeZone: string) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone }));

  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(req: Request) {
  try {
    const sql = getSql();
    const url = new URL(req.url);

    const timeZone =
      url.searchParams.get("timeZone") || "America/New_York";

    const today = todayInTimeZone(timeZone);

    const rows = await sql`
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
      ORDER BY date ASC, time ASC
    `;

    const events = rows
      .map((row: any) => ({
        id: row.id,
        title: row.title,
        type: row.type,
        date: normalizeDate(row.date),
        time: row.time ?? "",
        notes: row.notes ?? "",
        remind: Boolean(row.remind),
        reminderMinutes: Number(row.reminder_minutes ?? 10),
        repeat: row.repeat ?? "none",
        repeatWeekdays: Array.isArray(row.repeat_weekdays)
          ? row.repeat_weekdays
          : [],
        repeatUntil: row.repeat_until ? normalizeDate(row.repeat_until) : "",
        timeZone: row.time_zone ?? timeZone,
      }))
      .filter((event: any) => event.date === today);

    return Response.json({
      success: true,
      today,
      timeZone,
      events,
      reading: null,
      readingMessage: "Reading plan sync is not connected yet.",
    });
  } catch (error: any) {
    console.error("Mobile today error:", error);

    return Response.json(
      {
        success: false,
        error: error?.message || "Failed to load today",
      },
      { status: 500 }
    );
  }
}