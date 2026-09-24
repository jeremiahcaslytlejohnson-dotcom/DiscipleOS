import { Router } from "express";
import { db, userSettingsTable } from "@workspace/db";
import { GetSettingsResponse, UpdateSettingsBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const defaultSettings = {
  paceMode: "standard",
  customMinutesPerChapter: 5,
  dailyReadingBudget: 20,
  preferredReadingTime: "07:00",
  readingOrder: "consecutive",
} as const;

function normalizeSettings(value: unknown) {
  const parsed = UpdateSettingsBody.safeParse(value);
  return parsed.success ? parsed.data : defaultSettings;
}

router.get("/settings", requireAuth, async (req, res) => {
  try {
    const userId = req.dbUser!.id;
    const [row] = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId))
      .limit(1);
    const response = GetSettingsResponse.parse({
      success: true,
      settings: normalizeSettings(row?.data),
    });
    res.json(response);
  } catch (err: any) {
    req.log.error({ err }, "GET /settings failed");
    res.status(500).json({ success: false, error: "Failed to load settings" });
  }
});

router.put("/settings", requireAuth, async (req, res) => {
  try {
    const parsed = UpdateSettingsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Invalid settings payload" });
      return;
    }
    const userId = req.dbUser!.id;
    const data = parsed.data;
    const [row] = await db
      .insert(userSettingsTable)
      .values({ userId, data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userSettingsTable.userId,
        set: { data, updatedAt: new Date() },
      })
      .returning();
    res.json(GetSettingsResponse.parse({ success: true, settings: normalizeSettings(row.data) }));
  } catch (err: any) {
    req.log.error({ err }, "PUT /settings failed");
    res.status(500).json({ success: false, error: "Failed to save settings" });
  }
});

export default router;