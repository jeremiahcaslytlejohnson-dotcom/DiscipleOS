import { Router } from "express";

const router = Router();

// POST /api/track
router.post("/track", async (req, res) => {
  req.log.info({ body: req.body }, "TRACK EVENT");
  res.json({ success: true });
});

export default router;
