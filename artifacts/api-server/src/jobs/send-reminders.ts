import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger";
import { inspectReminderWorkerConfig } from "./reminderWorkerConfig";

function safeErrorFields(error: unknown) {
  const candidate = error as { name?: unknown; code?: unknown } | null;
  return {
    errorName:
      typeof candidate?.name === "string" ? candidate.name : "UnknownError",
    errorCode:
      typeof candidate?.code === "string" ? candidate.code : undefined,
  };
}

async function runScheduledReminderJob(): Promise<void> {
  const invocationId = randomUUID();
  const config = inspectReminderWorkerConfig();

  logger.info(
    {
      event: "reminder_worker_invocation",
      invocationId,
      source: "scheduled",
      status: config.ok ? "started" : "configuration_invalid",
      ...config.checks,
      issues: config.issues,
    },
    "Scheduled reminder worker invocation",
  );

  if (!config.ok) {
    logger.error(
      {
        event: "reminder_worker_configuration_invalid",
        invocationId,
        issues: config.issues,
      },
      "Scheduled reminder worker configuration is invalid",
    );
    process.exitCode = 1;
    return;
  }

  let pool: { end(): Promise<void> } | undefined;

  try {
    const [{ sendDueReminders }, { pool: dbPool }] = await Promise.all([
      import("../services/reminderDelivery"),
      import("@workspace/db"),
    ]);
    pool = dbPool;

    const summary = await sendDueReminders({
      invocationId,
      source: "scheduled",
    });

    const deliveryErrorCount =
      summary.failedDeliveries +
      summary.processingErrors +
      summary.deliveryRecordErrors;
    const deliveryStatus =
      deliveryErrorCount > 0
        ? "completed_with_delivery_errors"
        : "no_delivery_errors";
    const completionFields = {
      event: "reminder_worker_completed",
      workerStatus: "completed",
      deliveryStatus,
      deliveryErrorCount,
      ...summary,
    };

    if (deliveryErrorCount > 0) {
      logger.warn(
        completionFields,
        "Scheduled reminder worker completed with delivery errors",
      );
    } else {
      logger.info(completionFields, "Scheduled reminder worker completed");
    }
  } catch (error) {
    logger.error(
      {
        event: "reminder_worker_failed",
        invocationId,
        ...safeErrorFields(error),
      },
      "Scheduled reminder worker failed",
    );
    process.exitCode = 1;
  } finally {
    await pool?.end().catch((error: unknown) => {
      logger.error(
        {
          event: "reminder_worker_pool_close_failed",
          invocationId,
          ...safeErrorFields(error),
        },
        "Scheduled reminder worker database pool close failed",
      );
      process.exitCode = 1;
    });
  }
}

await runScheduledReminderJob();