import {
  and,
  asc,
  desc,
  eq,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { Router, type NextFunction, type Request, type Response } from "express";
import { db, feedbackTable, usersTable } from "@workspace/db";
import { sendFeedbackNotification } from "../services/emailDelivery";

const router = Router();
const FEEDBACK_MAX_LENGTH = 2_000;
const FEEDBACK_CATEGORIES = new Set(["feedback", "bug", "idea"]);
const FEEDBACK_OWNER_EMAIL = "jeremiah.cas.lytle.johnson@gmail.com";
const FEEDBACK_NOTIFICATION_PENDING = "pending";
const FEEDBACK_NOTIFICATION_FAILED = "failed";
const FEEDBACK_NOTIFICATION_SENDING = "sending";
const FEEDBACK_NOTIFICATION_SENT = "sent";
const FEEDBACK_NOTIFICATION_RETRY_LEASE_MS = 10 * 60 * 1_000;
const FEEDBACK_NOTIFICATION_RETRY_BATCH_SIZE = 50;

function requireFeedbackOwner(req: Request, res: Response, next: NextFunction) {
  if (!req.dbUser) {
    res.status(401).json({ success: false, error: "Sign in required" });
    return;
  }

  if (req.dbUser.email?.trim().toLowerCase() !== FEEDBACK_OWNER_EMAIL) {
    res.status(403).json({ success: false, error: "Feedback owner access required" });
    return;
  }

  next();
}

function getNotificationError(error: unknown) {
  return (error instanceof Error ? error.message : String(error)).slice(0, 2_000);
}

async function markNotificationSent(feedbackId: string) {
  await db
    .update(feedbackTable)
    .set({
      notificationStatus: FEEDBACK_NOTIFICATION_SENT,
      notificationSentAt: new Date(),
      notificationLastError: null,
    })
    .where(
      and(
        eq(feedbackTable.id, feedbackId),
        isNull(feedbackTable.notificationSentAt),
      ),
    );
}

async function markNotificationFailed(feedbackId: string, error: unknown) {
  await db
    .update(feedbackTable)
    .set({
      notificationStatus: FEEDBACK_NOTIFICATION_FAILED,
      notificationLastError: getNotificationError(error),
    })
    .where(
      and(
        eq(feedbackTable.id, feedbackId),
        isNull(feedbackTable.notificationSentAt),
      ),
    );
}

async function claimNotification(feedbackId: string) {
  const now = new Date();
  const staleLeaseBefore = new Date(
    now.getTime() - FEEDBACK_NOTIFICATION_RETRY_LEASE_MS,
  );

  const [claimed] = await db
    .update(feedbackTable)
    .set({
      notificationStatus: FEEDBACK_NOTIFICATION_SENDING,
      notificationAttempts: sql`${feedbackTable.notificationAttempts} + 1`,
      notificationLastAttemptAt: now,
      notificationLastError: null,
    })
    .where(
      and(
        eq(feedbackTable.id, feedbackId),
        isNull(feedbackTable.notificationSentAt),
        or(
          eq(feedbackTable.notificationStatus, FEEDBACK_NOTIFICATION_PENDING),
          eq(feedbackTable.notificationStatus, FEEDBACK_NOTIFICATION_FAILED),
          and(
            eq(feedbackTable.notificationStatus, FEEDBACK_NOTIFICATION_SENDING),
            or(
              isNull(feedbackTable.notificationLastAttemptAt),
              lt(feedbackTable.notificationLastAttemptAt, staleLeaseBefore),
            ),
          ),
        ),
      ),
    )
    .returning({
      id: feedbackTable.id,
      createdAt: feedbackTable.createdAt,
      category: feedbackTable.category,
      message: feedbackTable.message,
      page: feedbackTable.page,
    });

  return claimed ?? null;
}

async function deliverClaimedNotification(
  feedback: {
    id: string;
    createdAt: Date;
    category: string;
    message: string;
    page: string | null;
  },
  userEmail: string | null,
) {
  try {
    await sendFeedbackNotification({ ...feedback, userEmail });
    await markNotificationSent(feedback.id);
    return { delivered: true, error: null };
  } catch (error) {
    try {
      await markNotificationFailed(feedback.id, error);
    } catch (recordError) {
      // Keep the original provider failure visible while also reporting that
      // the retry state could not be persisted.
      return {
        delivered: false,
        error: `${getNotificationError(error)}; could not record retry state: ${getNotificationError(recordError)}`,
      };
    }
    return { delivered: false, error: getNotificationError(error) };
  }
}

router.post("/feedback", async (req, res) => {
  const message =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const category =
    typeof req.body?.category === "string" &&
    FEEDBACK_CATEGORIES.has(req.body.category)
      ? req.body.category
      : "feedback";
  const page =
    typeof req.body?.page === "string"
      ? req.body.page.trim().slice(0, 200) || null
      : null;

  if (message.length < 2 || message.length > FEEDBACK_MAX_LENGTH) {
    res.status(400).json({
      success: false,
      error: `Feedback must be between 2 and ${FEEDBACK_MAX_LENGTH} characters.`,
    });
    return;
  }

  try {
    const [storedFeedback] = await db
      .insert(feedbackTable)
      .values({
        userId: req.dbUser?.id ?? req.session.anonymousUserId ?? null,
        category,
        message,
        page,
        notificationStatus: FEEDBACK_NOTIFICATION_PENDING,
      })
      .returning();

    const claimed = await claimNotification(storedFeedback.id);
    const delivery = claimed
      ? await deliverClaimedNotification(claimed, req.dbUser?.email ?? null)
      : {
          delivered: false,
          error: "Could not claim the saved feedback notification.",
        };
    if (!delivery.delivered) {
      req.log.error(
        { error: delivery.error, feedbackId: storedFeedback.id },
        "Feedback notification email failed",
      );
    }

    res.status(201).json({ success: true });
  } catch (error) {
    req.log.error({ error }, "POST /feedback failed");
    res.status(500).json({ success: false, error: "Could not send feedback." });
  }
});

router.post(
  "/feedback/notifications/retry",
  requireFeedbackOwner,
  async (req, res) => {
    try {
      const retryableFeedback = await db
        .select({
          id: feedbackTable.id,
          userEmail: usersTable.email,
        })
        .from(feedbackTable)
        .leftJoin(usersTable, eq(feedbackTable.userId, usersTable.id))
        .where(
          and(
            isNull(feedbackTable.notificationSentAt),
            or(
              eq(feedbackTable.notificationStatus, FEEDBACK_NOTIFICATION_PENDING),
              eq(feedbackTable.notificationStatus, FEEDBACK_NOTIFICATION_FAILED),
              and(
                eq(
                  feedbackTable.notificationStatus,
                  FEEDBACK_NOTIFICATION_SENDING,
                ),
                or(
                  isNull(feedbackTable.notificationLastAttemptAt),
                  lt(
                    feedbackTable.notificationLastAttemptAt,
                    new Date(
                      Date.now() - FEEDBACK_NOTIFICATION_RETRY_LEASE_MS,
                    ),
                  ),
                ),
              ),
            ),
          ),
        )
        .orderBy(asc(feedbackTable.createdAt))
        .limit(FEEDBACK_NOTIFICATION_RETRY_BATCH_SIZE);

      let attempted = 0;
      let delivered = 0;
      const failures: Array<{ id: string; error: string }> = [];

      for (const candidate of retryableFeedback) {
        const claimed = await claimNotification(candidate.id);
        if (!claimed) continue;

        attempted += 1;
        const delivery = await deliverClaimedNotification(
          claimed,
          candidate.userEmail,
        );
        if (delivery.delivered) {
          delivered += 1;
        } else {
          failures.push({ id: claimed.id, error: delivery.error! });
          req.log.error(
            { error: delivery.error, feedbackId: claimed.id },
            "Feedback notification retry failed",
          );
        }
      }

      res.json({
        success: true,
        attempted,
        delivered,
        failed: failures.length,
        failures,
      });
    } catch (error) {
      req.log.error({ error }, "POST /feedback/notifications/retry failed");
      res.status(500).json({
        success: false,
        error: "Could not retry feedback notifications.",
      });
    }
  },
);

router.post(
  "/feedback/:id/notification/retry",
  requireFeedbackOwner,
  async (req, res) => {
    const feedbackId = typeof req.params.id === "string" ? req.params.id : "";
    if (!feedbackId) {
      res.status(400).json({ success: false, error: "Feedback ID is required." });
      return;
    }

    try {
      const [candidate] = await db
        .select({
          id: feedbackTable.id,
          userEmail: usersTable.email,
          notificationSentAt: feedbackTable.notificationSentAt,
        })
        .from(feedbackTable)
        .leftJoin(usersTable, eq(feedbackTable.userId, usersTable.id))
        .where(eq(feedbackTable.id, feedbackId));

      if (!candidate) {
        res.status(404).json({ success: false, error: "Feedback not found." });
        return;
      }

      if (candidate.notificationSentAt) {
        res.json({
          success: true,
          attempted: 0,
          delivered: 0,
          failed: 0,
          alreadySent: true,
        });
        return;
      }

      const claimed = await claimNotification(feedbackId);
      if (!claimed) {
        const [current] = await db
          .select({
            notificationStatus: feedbackTable.notificationStatus,
            notificationSentAt: feedbackTable.notificationSentAt,
          })
          .from(feedbackTable)
          .where(eq(feedbackTable.id, feedbackId));

        if (current?.notificationSentAt) {
          res.json({
            success: true,
            attempted: 0,
            delivered: 0,
            failed: 0,
            alreadySent: true,
          });
          return;
        }

        res.status(409).json({
          success: false,
          error:
            current?.notificationStatus === FEEDBACK_NOTIFICATION_SENDING
              ? "This notification is already being sent."
              : "This feedback notification is not eligible for retry.",
        });
        return;
      }

      const delivery = await deliverClaimedNotification(
        claimed,
        candidate.userEmail,
      );
      if (!delivery.delivered) {
        req.log.error(
          { error: delivery.error, feedbackId: claimed.id },
          "Feedback notification retry failed",
        );
        res.status(502).json({
          success: false,
          attempted: 1,
          delivered: 0,
          failed: 1,
          error: delivery.error,
        });
        return;
      }

      res.json({
        success: true,
        attempted: 1,
        delivered: 1,
        failed: 0,
        alreadySent: false,
      });
    } catch (error) {
      req.log.error(
        { error, feedbackId },
        "POST /feedback/:id/notification/retry failed",
      );
      res.status(500).json({
        success: false,
        error: "Could not retry this feedback notification.",
      });
    }
  },
);

router.get("/feedback", requireFeedbackOwner, async (req, res) => {
  try {
    const feedback = await db
      .select({
        id: feedbackTable.id,
        createdAt: feedbackTable.createdAt,
        category: feedbackTable.category,
        message: feedbackTable.message,
        page: feedbackTable.page,
        userId: feedbackTable.userId,
        userEmail: usersTable.email,
        reviewedAt: feedbackTable.reviewedAt,
        notificationStatus: feedbackTable.notificationStatus,
        notificationAttempts: feedbackTable.notificationAttempts,
        notificationLastAttemptAt: feedbackTable.notificationLastAttemptAt,
        notificationLastError: feedbackTable.notificationLastError,
        notificationSentAt: feedbackTable.notificationSentAt,
      })
      .from(feedbackTable)
      .leftJoin(usersTable, eq(feedbackTable.userId, usersTable.id))
      .orderBy(desc(feedbackTable.createdAt));

    res.json({ success: true, feedback });
  } catch (error) {
    req.log.error({ error }, "GET /feedback failed");
    res.status(500).json({ success: false, error: "Could not load feedback." });
  }
});

router.patch("/feedback/:id", requireFeedbackOwner, async (req, res) => {
  if (typeof req.body?.reviewed !== "boolean") {
    res.status(400).json({ success: false, error: "Reviewed must be a boolean." });
    return;
  }

  try {
    const feedbackId = typeof req.params.id === "string" ? req.params.id : "";
    const [updatedFeedback] = await db
      .update(feedbackTable)
      .set({ reviewedAt: req.body.reviewed ? new Date() : null })
      .where(eq(feedbackTable.id, feedbackId))
      .returning({
        id: feedbackTable.id,
        reviewedAt: feedbackTable.reviewedAt,
      });

    if (!updatedFeedback) {
      res.status(404).json({ success: false, error: "Feedback not found." });
      return;
    }

    res.json({ success: true, feedback: updatedFeedback });
  } catch (error) {
    req.log.error({ error, feedbackId: req.params.id }, "PATCH /feedback failed");
    res.status(500).json({ success: false, error: "Could not update feedback." });
  }
});

export default router;