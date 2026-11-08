import { Router, type Request, type Response, type NextFunction } from "express";
import { db, analyticsRateLimitsTable } from "@workspace/db";
import { lt, sql } from "drizzle-orm";

const router = Router();
const MAX_EVENTS_PER_WINDOW = 30;
const MAX_PROPERTY_COUNT = 20;
const MAX_PROPERTY_STRING_LENGTH = 256;
const CLEANUP_INTERVAL_MS = 15 * 60_000;
let lastCleanupAt = 0;

async function rateLimitTrack(req: Request, res: Response, next: NextFunction) {
  const key = req.ip || "unknown";
  const windowExpired = sql`
    ${analyticsRateLimitsTable.windowStartedAt} <= NOW() - INTERVAL '1 minute'
  `;
  const [rateLimit] = await db
    .insert(analyticsRateLimitsTable)
    .values({ clientIp: key, windowStartedAt: sql`NOW()`, requestCount: 1 })
    .onConflictDoUpdate({
      target: analyticsRateLimitsTable.clientIp,
      set: {
        windowStartedAt: sql`
          CASE WHEN ${windowExpired}
          THEN NOW()
          ELSE ${analyticsRateLimitsTable.windowStartedAt}
          END
        `,
        requestCount: sql`
          CASE WHEN ${windowExpired}
          THEN 1
          ELSE ${analyticsRateLimitsTable.requestCount} + 1
          END
        `,
      },
    })
    .returning({ requestCount: analyticsRateLimitsTable.requestCount });

  const now = Date.now();
  if (now - lastCleanupAt >= CLEANUP_INTERVAL_MS) {
    lastCleanupAt = now;
    void db
      .delete(analyticsRateLimitsTable)
      .where(
        lt(
          analyticsRateLimitsTable.windowStartedAt,
          sql`NOW() - INTERVAL '1 hour'`,
        ),
      )
      .catch(() => {
        // Cleanup is best-effort; it must not affect analytics request handling.
      });
  }

  if ((rateLimit?.requestCount ?? 0) > MAX_EVENTS_PER_WINDOW) {
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
