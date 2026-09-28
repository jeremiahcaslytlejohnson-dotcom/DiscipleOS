import { Router } from "express";
import { sendDueReminders } from "../services/reminderDelivery";

const router = Router();

function safeErrorFields(error: unknown) {
  const candidate = error as {
    name?: unknown;
    code?: unknown;
    statusCode?: unknown;
    message?: unknown;
  } | null;
  return {
    errorName:
      typeof candidate?.name === "string" ? candidate.name : "UnknownError",
    errorCode:
      typeof candidate?.code === "string" ? candidate.code : undefined,
    statusCode:
      typeof candidate?.statusCode === "number"
        ? candidate.statusCode
        : undefined,
  };
}

function isVapidConfigurationError(error: unknown): boolean {
  const candidate = error as { message?: unknown } | null;
  return (
    typeof candidate?.message === "string" &&
    candidate.message.toLowerCase().includes("vapid")
  );
}

// POST /api/reminders/send — fire due reminders per user (CRON_SECRET required)
router.post("/reminders/send", async (req, res): Promise<void> => {
  const secret = req.headers["x-cron-secret"] || req.query["secret"];
  if (!secret || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  try {
    const summary = await sendDueReminders();
    res.json({ success: true, ...summary });
  } catch (error) {
    req.log.error(
      {
        event: "reminder_api_request_failed",
        ...safeErrorFields(error),
      },
      "POST /reminders/send failed",
    );
    res.status(500).json({
      success: false,
      error: isVapidConfigurationError(error)
        ? "VAPID configuration error"
        : "Failed to send reminders",
    });
  }
});

export default router;
