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

function normalizeDate(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value as string | number | Date).toISOString().slice(0, 10);
}

export async function GET() {
  const sql = getSql();

  const rows = await sql`
    SELECT *
    FROM reading_plans
    ORDER BY created_at DESC
  `;

  const plans = rows.map((row: any) => {
    const assignments = Array.isArray(row.assignments) ? row.assignments : [];

    const selectedBooks = Array.from(
      new Set(
        assignments.flatMap((day: any) =>
          Array.isArray(day.readings)
            ? day.readings.map((reading: any) => reading.book).filter(Boolean)
            : []
        )
      )
    );

    return {
      id: row.id,
      name: row.title,
      title: row.title,
      startDate: normalizeDate(row.start_date),
      endDate: normalizeDate(row.end_date),
      readingMode: row.assignment_mode || "consecutive",
      assignmentMode: row.assignment_mode || "consecutive",
      assignments,
      completed: row.completed || {},
      completedChapterKeys: Object.keys(row.completed || {}).filter(
        (key) => row.completed?.[key]
        ),
      selectedBooks,
      readingTime: "07:00",
      color: "from-sky-500 to-indigo-500",
    };
  });

  return Response.json({ success: true, plans });
}

export async function POST(req: Request) {
  const sql = getSql();
  const body = await req.json();

  const {
    id,
    title,
    startDate,
    endDate,
    assignmentMode,
    assignments,
  } = body;

  await sql`
    INSERT INTO reading_plans (
      id,
      title,
      start_date,
      end_date,
      assignment_mode,
      assignments
    )
    VALUES (
      ${id},
      ${title},
      ${startDate},
      ${endDate},
      ${assignmentMode},
      ${JSON.stringify(assignments)}
    )
    ON CONFLICT (id)
    DO UPDATE SET
      title = EXCLUDED.title,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      assignment_mode = EXCLUDED.assignment_mode,
      assignments = EXCLUDED.assignments,
      updated_at = NOW()
  `;

  return Response.json({ success: true });
}

export async function DELETE(req: Request) {
  const sql = getSql();
  const body = await req.json();

  if (!body?.id) {
    return Response.json(
      { success: false, error: "Missing plan id" },
      { status: 400 }
    );
  }

  await sql`
    DELETE FROM reading_plans
    WHERE id = ${body.id}
  `;

  return Response.json({ success: true });
}