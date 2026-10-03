import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";
import { pool } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

async function checkReadiness(req: Request, res: Response) {
  try {
    await pool.query("SELECT 1");
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch (error) {
    const candidate = error as { name?: unknown; code?: unknown } | null;
    req.log.warn(
      {
        event: "database_readiness_check_failed",
        errorName:
          typeof candidate?.name === "string"
            ? candidate.name
            : "UnknownError",
        errorCode:
          typeof candidate?.code === "string"
            ? candidate.code
            : undefined,
      },
      "Database readiness check failed",
    );
    res.status(503).json({
      status: "not_ready",
      dependency: "database",
    });
  }
}

// The deployment router probes the artifact base path (/api), while this
// service also declares /api/healthz as its startup path. Both paths must
// report the same database-backed readiness without creating a session.
router.get("/", checkReadiness);
router.get("/healthz", checkReadiness);

export default router;
