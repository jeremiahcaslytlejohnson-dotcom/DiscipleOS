import { Router } from "express";
import { db } from "@workspace/db";
import { readingPlansTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

// GET /api/reading/plans
router.get("/reading/plans", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(readingPlansTable)
      .orderBy(readingPlansTable.updatedAt);
    const plans = rows.map((r) => r.data);
    res.json({ success: true, plans });
  } catch (err: any) {
    req.log.error({ err }, "GET /reading/plans failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to load plans" });
  }
});

// POST /api/reading/plans — upsert
router.post("/reading/plans", async (req, res) => {
  try {
    const plan = req.body;
    if (!plan?.id) {
      res.status(400).json({ success: false, error: "Missing plan id" });
      return;
    }
    await db
      .insert(readingPlansTable)
      .values({ id: plan.id, data: plan, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: readingPlansTable.id,
        set: { data: plan, updatedAt: new Date() },
      });
    res.json({ success: true, plan });
  } catch (err: any) {
    req.log.error({ err }, "POST /reading/plans failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to save plan" });
  }
});

// DELETE /api/reading/plans
router.delete("/reading/plans", async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ success: false, error: "Missing plan id" });
      return;
    }
    await db.delete(readingPlansTable).where(eq(readingPlansTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "DELETE /reading/plans failed");
    res.status(500).json({ success: false, error: err?.message || "Failed to delete plan" });
  }
});

// POST /api/reading/complete
router.post("/reading/complete", async (req, res) => {
  try {
    const { planId, key, completed } = req.body;
    if (!planId || !key) {
      res.status(400).json({ success: false, error: "Missing planId or key" });
      return;
    }

    const value = Boolean(completed);

    // Update the completed map inside the JSONB data column
    await db.execute(
      sql`UPDATE reading_plans
          SET data = jsonb_set(
            COALESCE(data, '{}'::jsonb),
            ARRAY['completed', ${key}],
            ${JSON.stringify(value)}::jsonb,
            true
          ),
          updated_at = NOW()
          WHERE id = ${planId}`
    );

    res.json({ success: true });
  } catch (err: any) {
    req.log.error({ err }, "POST /reading/complete failed");
    res.status(500).json({ success: false, error: err?.message || "Failed" });
  }
});

export default router;
