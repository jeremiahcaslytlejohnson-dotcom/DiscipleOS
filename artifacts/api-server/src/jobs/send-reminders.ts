const requiredRuntimeValues = [
  "DATABASE_URL",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
] as const;

export {};

const missingValues = requiredRuntimeValues.filter((name) => !process.env[name]);

if (missingValues.length) {
  console.error(
    JSON.stringify({
      success: false,
      error: "Missing required scheduled-worker configuration",
      missing: missingValues,
    }),
  );
  process.exit(1);
}

let pool: { end(): Promise<void> } | undefined;

try {
  const [{ sendDueReminders }, { pool: dbPool }] = await Promise.all([
    import("../services/reminderDelivery"),
    import("@workspace/db"),
  ]);
  pool = dbPool;
  const summary = await sendDueReminders();
  console.log(JSON.stringify({ success: true, ...summary }));
} catch (err: any) {
  // The full error object can contain connection details, so keep job output safe.
  console.error(
    JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : "Scheduled reminder job failed",
    }),
  );
  process.exitCode = 1;
} finally {
  await pool?.end();
}