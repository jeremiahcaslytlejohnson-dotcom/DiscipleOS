import { lte } from "drizzle-orm";
import { authEmailCodesTable, db } from "@workspace/db";
import { logger } from "../lib/logger";

const AUTH_CODE_RETENTION_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

export async function purgeExpiredAuthCodeRows(now = new Date()) {
  const retentionCutoff = new Date(now.getTime() - AUTH_CODE_RETENTION_MS);
  const deleted = await db
    .delete(authEmailCodesTable)
    .where(lte(authEmailCodesTable.expiresAt, retentionCutoff))
    .returning({ id: authEmailCodesTable.id });

  return deleted.length;
}

export function startAuthCodeRetentionCleanup() {
  if (process.env.NODE_ENV !== "production") return () => {};

  let cleanupInProgress = false;
  const runCleanup = async () => {
    if (cleanupInProgress) return;
    cleanupInProgress = true;
    try {
      const deleted = await purgeExpiredAuthCodeRows();
      if (deleted > 0) {
        logger.info(
          { deleted },
          "Purged auth-code rows past the 24-hour retention window",
        );
      }
    } catch (error) {
      logger.error({ error }, "Failed to purge expired auth-code rows");
    } finally {
      cleanupInProgress = false;
    }
  };

  void runCleanup();
  const timer = setInterval(() => {
    void runCleanup();
  }, CLEANUP_INTERVAL_MS);
  timer.unref();

  return () => clearInterval(timer);
}
