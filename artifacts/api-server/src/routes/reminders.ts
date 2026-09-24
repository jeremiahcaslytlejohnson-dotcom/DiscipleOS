import { Router } from "express";
import { sendDueReminders } from "../services/reminderDelivery";

const router = Router();

// POST /api/reminders/send — fire due reminders per user (CRON_SECRET required)
router.post("/reminders/send", async (req, res) => {
  const secret = req.headers["x-cron-secret"] || req.query["secret"];
  if (!secret || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  try {
    const summary = await sendDueReminders();
    res.json({ success: true, ...summary });
  } catch (err: any) {
    req.log.error({ err }, "POST /reminders/send failed");
    res.status(500).json({ success: false, error: err?.message || "Failed" });
  }
});

export default router;
