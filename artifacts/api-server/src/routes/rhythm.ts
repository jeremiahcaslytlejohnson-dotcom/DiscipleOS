import { Router } from "express";
import { getRhythmAccessTier } from "../auth/capabilities";
import { loadMountainRhythm } from "../services/mountainRhythm";

const router = Router();

router.get("/rhythm/score", async (req, res) => {
  try {
    const timeZone =
      typeof req.query.timeZone === "string" && req.query.timeZone.trim()
        ? req.query.timeZone
        : "America/New_York";
    const selectedPlanId =
      typeof req.query.planId === "string" && req.query.planId.trim()
        ? req.query.planId.trim()
        : null;
    // Validate the requested IANA zone before calculating local boundaries.
    new Intl.DateTimeFormat("en-US", { timeZone }).format();

    const result = await loadMountainRhythm(
      req.session.userId!,
      timeZone,
      getRhythmAccessTier(req),
      selectedPlanId,
    );
    res.json({ success: true, accessTier: getRhythmAccessTier(req), ...result });
  } catch (err: any) {
    req.log.error({ err }, "GET /rhythm/score failed");
    res.status(400).json({ success: false, error: err?.message || "Failed to load rhythm score" });
  }
});

export default router;