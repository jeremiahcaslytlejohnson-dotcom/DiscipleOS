import { Router, type Request, type Response, type NextFunction } from "express";
import { pool } from "@workspace/db";

const router = Router();
const MAX_EVENTS_PER_WINDOW = 30;
const MAX_PROPERTY_COUNT = 20;
const MAX_PROPERTY_STRING_LENGTH = 256;
const CLEANUP_INTERVAL_MS = 15 * 60_000;
let rateLimitTableSetup: Promise<void> | undefined;
let lastCleanupAt = 0;

async function ensureRateLimitTable(): Promise<void> {
  if (!rateLimitTableSetup) {
    rateLimitTableSetup = pool
      .query(`
        CREATE TABLE IF NOT EXISTS analytics_rate_limits (
          client_ip text PRIMARY KEY,
          window_started_at timestamptz NOT NULL,
          request_count integer NOT NULL
        )
      `)
      .then(() => undefined)
      .catch((error: unknown) => {
        rateLimitTableSetup = undefined;
        throw error;
      });
  }
  await rateLimitTableSetup;
}

async function rateLimitTrack(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || "unknown";
  await ensureRateLimitTable();

  const result = await pool.query<{ request_count: number }>(
    `
      INSERT INTO analytics_rate_limits (client_ip, window_started_at, request_count)
      VALUES ($1, NOW(), 1)
      ON CONFLICT (client_ip) DO UPDATE SET
        window_started_at = CASE
          WHEN analytics_rate_limits.window_started_at <= NOW() - INTERVAL '1 minute'
          THEN NOW()
          ELSE analytics_rate_limits.window_started_at
        END,
        request_count = CASE
          WHEN analytics_rate_limits.window_started_at <= NOW() - INTERVAL '1 minute'
          THEN 1
          ELSE analytics_rate_limits.request_count + 1
        END
      RETURNING request_count
    `,
    [key],
  );

  const now = Date.now();
  if (now - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
    lastCleanupAt = now;
    void pool
      .query(
        "DELETE FROM analytics_rate_limits WHERE window_started_at < NOW() - INTERVAL '1 hour'",
      )
      .catch(() => {
        // Cleanup is best-effort; it must not affect analytics request handling.
      });
  }

  if (result.rows[0].request_count > MAX_EVENTS_PER_WINDOW) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ success: false, error: "Too many analytics events" });
    return;
  }
  next();
}

function isValidProperties(value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value);
  if (entries.length > MAX_PROPERTY_COUNT) return false;
  return entries.every(([key, item]) => {
    if (!/^[A-Za-z0-9_.:-]{1,64}$/.test(key)) return false;
    if (typeof item === "string") return item.length <= MAX_PROPERTY_STRING_LENGTH;
    return (
      item === null ||
      typeof item === "boolean" ||
      (typeof item === "number" && Number.isFinite(item))
    );
  });
}

// POST /api/track — bounded, allowlisted, non-persistent analytics intake.
router.post("/track", rateLimitTrack, (req, res) => {
  const body = req.body;
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !["event", "properties"].includes(key)) ||
    typeof body.event !== "string" ||
    !/^[A-Za-z0-9_.:-]{1,80}$/.test(body.event) ||
    !isValidProperties(body.properties)
  ) {
    res.status(400).json({ success: false, error: "Invalid analytics event" });
    return;
  }

  // Never persist or log arbitrary event properties.
  res.json({ success: true });
});

export default router;
