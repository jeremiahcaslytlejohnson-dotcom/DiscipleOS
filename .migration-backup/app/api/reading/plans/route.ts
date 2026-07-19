import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

function getDatabaseUrl() {
  return (
    process.env.DISCIPLEOS_POSTGRES_URL ||
    process.env.discipleos_POSTGRES_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL
  );
}

function getSql() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("No database connection string was provided to neon()");
  }

  return neon(databaseUrl);
}

export async function GET() {
  try {
    const sql = getSql();
    
    const rows = await sql`
      SELECT data
      FROM reading_plans
      ORDER BY updated_at DESC
    `;

    const plans = rows.map((row: any) => row.data);

    return Response.json({ success: true, plans });
  } catch (error) {
    console.error("GET /api/reading/plans failed:", error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sql = getSql();
    
    const plan = await request.json();

    if (!plan?.id) {
      return Response.json(
        { success: false, error: "Missing plan id" },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO reading_plans (id, data, updated_at)
      VALUES (${plan.id}, ${JSON.stringify(plan)}::jsonb, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
    `;

    return Response.json({ success: true, plan });
  } catch (error) {
    console.error("POST /api/reading/plans failed:", error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const sql = getSql();
    
    const body = await request.json();
    const id = body?.id;

    if (!id) {
      return Response.json(
        { success: false, error: "Missing plan id" },
        { status: 400 }
      );
    }

const result = await sql`
  DELETE FROM reading_plans
  WHERE id = ${id}
  RETURNING id
`;

return Response.json({
  success: result.length > 0,
  id,
  deletedCount: result.length,
});
  } catch (error) {
    console.error("DELETE /api/reading/plans failed:", error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}