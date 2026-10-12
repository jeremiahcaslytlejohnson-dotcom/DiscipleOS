import { Router, type Request, type Response, type NextFunction } from "express";

const router = Router();
const WINDOW_MS = 60_000;
const MAX_EVENTS_PER_WINDOW = 30;
const MAX_PROPERTY_COUNT = 20;
const MAX_PROPERTY_STRING_LENGTH = 256;
const requestsByIp = new Map<string, { start: number; count: number }>();

function rateLimitTrack(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const key = req.ip || "unknown";
  let entry = requestsByIp.get(key);
  if (!entry || now - entry.start >= WINDOW_MS) {
    entry = { start: now, count: 0 };
    requestsByIp.set(key, entry);
  }
  entry.count++;

  if (requestsByIp.size > 10_000) {
    for (const [ip, value] of requestsByIp) {
      if (now - value.start >= WINDOW_MS) requestsByIp.delete(ip);
    }
  }

  if (entry.count > MAX_EVENTS_PER_WINDOW) {
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
