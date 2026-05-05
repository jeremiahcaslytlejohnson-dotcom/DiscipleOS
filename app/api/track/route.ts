export async function POST(req: Request) {
  const body = await req.json();

  console.log("TRACK EVENT:", {
    ...body,
    at: new Date().toISOString(),
  });

  return Response.json({ ok: true });
}