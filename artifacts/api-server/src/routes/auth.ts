import { and, desc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { Router, type Request } from "express";
import {
  authEmailCodesTable,
  db,
  eventCompletionsTable,
  eventsTable,
  feedbackTable,
  legacyAuthIdentitiesTable,
  pushSubscriptionsTable,
  readingPlansTable,
  sentRemindersTable,
  sessionTable,
  userSettingsTable,
  usersTable,
} from "@workspace/db";
import {
  AUTH_CODE_TTL_MS,
  AUTH_MAX_ATTEMPTS,
  AUTH_MAX_CODES_PER_HOUR,
  AUTH_RESEND_INTERVAL_MS,
  generateVerificationCode,
  hashVerificationCode,
  normalizeEmail,
  verifyVerificationCode,
  type AuthPurpose,
} from "../lib/auth-codes";
import {
  EmailDeliveryFailedError,
  EmailDeliveryNotConfiguredError,
  isTestVerificationEmail,
  isEmailDeliveryConfigured,
  clearTestVerificationCode,
  sendVerificationEmail,
  takeTestVerificationCode,
} from "../services/emailDelivery";

const router = Router();

function getRequestIp(req: Request) {
  return typeof req.ip === "string" ? req.ip.slice(0, 255) : null;
}

function saveSession(req: any) {
  return new Promise<void>((resolve, reject) => {
    req.session.save((error: unknown) => (error ? reject(error) : resolve()));
  });
}

function destroySession(req: any) {
  return new Promise<void>((resolve, reject) => {
    req.session.destroy((error: unknown) => (error ? reject(error) : resolve()));
  });
}

function parsePurpose(value: unknown): AuthPurpose | null {
  return value === "email" || value === "sign-in" || value === "sign-up" ? value : null;
}

function userByEmail(email: string) {
  return sql`lower(${usersTable.email}) = ${email}`;
}

function rateLimitResponse(res: any, retryAfterSeconds: number) {
  res.setHeader("Retry-After", String(retryAfterSeconds));
  res.status(429).json({
    success: false,
    error: "Too many verification requests. Try again later.",
    retryAfterSeconds,
  });
}

router.get("/auth/me", (req, res) => {
  const user = req.dbUser;
  res.json({
    authenticated: Boolean(user),
    user: user
      ? {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        }
      : null,
  });
});

router.get("/auth/test-code", (req, res) => {
  const email = normalizeEmail(req.query.email);
  if (!email || !isTestVerificationEmail(email)) {
    res.status(404).json({ success: false, error: "Not found." });
    return;
  }

  const code = takeTestVerificationCode(email);
  if (!code) {
    res.status(404).json({ success: false, error: "Verification code not found." });
    return;
  }

  res.json({ success: true, code });
});

router.post("/auth/test-cleanup", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(404).json({ success: false, error: "Not found." });
    return;
  }

  const rawEmails: unknown[] = Array.isArray(req.body?.emails)
    ? req.body.emails
    : [];
  const normalizedEmails = rawEmails
    .filter((email): email is string => typeof email === "string")
    .map((email) => normalizeEmail(email))
    .filter((email): email is string => Boolean(email));
  const emails: string[] = [...new Set(normalizedEmails)];
  if (
    emails.length === 0 ||
    emails.length > 100 ||
    emails.some((email) => !isTestVerificationEmail(email))
  ) {
    res.status(404).json({ success: false, error: "Not found." });
    return;
  }

  try {
    const deleted = await db.transaction(async (tx) => {
      const fixtureUsers = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(inArray(usersTable.email, emails));
      const userIds = fixtureUsers.map((user) => user.id);
      const anonymousUserId = req.session.anonymousUserId;
      const ownerIds = [
        ...new Set(
          [anonymousUserId, ...userIds].filter(
            (id): id is string => typeof id === "string" && id.length > 0,
          ),
        ),
      ];

      let eventIds: string[] = [];
      let deletedCompletions = 0;
      let deletedSentReminders = 0;
      let deletedPlans = 0;
      let deletedSubscriptions = 0;
      let deletedSettings = 0;
      let deletedFeedback = 0;
      let deletedLegacyIdentities = 0;
      let deletedSessions = 0;
      if (ownerIds.length > 0) {
        const fixtureEvents = await tx
          .select({ id: eventsTable.id })
          .from(eventsTable)
          .where(inArray(eventsTable.userId, ownerIds));
        eventIds = fixtureEvents.map((event) => event.id);

        if (eventIds.length > 0) {
          deletedCompletions = (
            await tx
            .delete(eventCompletionsTable)
            .where(inArray(eventCompletionsTable.eventId, eventIds))
            .returning({ eventId: eventCompletionsTable.eventId })
          ).length;
          deletedSentReminders = (
            await tx
            .delete(sentRemindersTable)
            .where(inArray(sentRemindersTable.eventId, eventIds))
            .returning({ id: sentRemindersTable.id })
          ).length;
          await tx.delete(eventsTable).where(inArray(eventsTable.id, eventIds));
        }

        deletedPlans = (
          await tx
          .delete(readingPlansTable)
          .where(inArray(readingPlansTable.userId, ownerIds))
          .returning({ id: readingPlansTable.id })
        ).length;
        deletedSubscriptions = (
          await tx
          .delete(pushSubscriptionsTable)
          .where(inArray(pushSubscriptionsTable.userId, ownerIds))
          .returning({ id: pushSubscriptionsTable.id })
        ).length;
        deletedSettings = (
          await tx
          .delete(userSettingsTable)
          .where(inArray(userSettingsTable.userId, ownerIds))
          .returning({ userId: userSettingsTable.userId })
        ).length;
        deletedFeedback = (
          await tx
          .delete(feedbackTable)
          .where(inArray(feedbackTable.userId, ownerIds))
          .returning({ id: feedbackTable.id })
        ).length;
        if (userIds.length > 0) {
          deletedLegacyIdentities = (
            await tx
          .delete(legacyAuthIdentitiesTable)
              .where(inArray(legacyAuthIdentitiesTable.userId, userIds))
              .returning({ userId: legacyAuthIdentitiesTable.userId })
          ).length;
        }

        const sessionConditions = ownerIds.flatMap((ownerId) => [
          sql`${sessionTable.sess}->>'anonymousUserId' = ${ownerId}`,
          sql`${sessionTable.sess}->>'authUserId' = ${ownerId}`,
          sql`${sessionTable.sess}->>'userId' = ${ownerId}`,
        ]);
        if (sessionConditions.length > 0) {
          deletedSessions = (
            await tx.delete(sessionTable).where(or(...sessionConditions)).returning({
              sid: sessionTable.sid,
            })
          ).length;
        }
      }

      if (userIds.length > 0) {
        await tx.delete(usersTable).where(inArray(usersTable.id, userIds));
      }

      const deletedCodes = await tx
        .delete(authEmailCodesTable)
        .where(inArray(authEmailCodesTable.email, emails))
        .returning({ id: authEmailCodesTable.id });

      return {
        users: userIds.length,
        events: eventIds.length,
        completions: deletedCompletions,
        sentReminders: deletedSentReminders,
        plans: deletedPlans,
        subscriptions: deletedSubscriptions,
        settings: deletedSettings,
        feedback: deletedFeedback,
        legacyIdentities: deletedLegacyIdentities,
        sessions: deletedSessions,
        codes: deletedCodes.length,
      };
    });

    for (const email of emails) {
      clearTestVerificationCode(email);
    }

    res.json({ success: true, deleted });
  } catch (error) {
    req.log.error({ error }, "POST /auth/test-cleanup failed");
    res.status(500).json({ success: false, error: "Could not clean up test data." });
  }
});

router.post("/auth/request-code", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const purpose = parsePurpose(req.body?.purpose);
  if (!email || !purpose) {
    res.status(400).json({ success: false, error: "Enter a valid email address." });
    return;
  }

  if (!isEmailDeliveryConfigured() && !isTestVerificationEmail(email)) {
    res.status(503).json({
      success: false,
      code: "EMAIL_DELIVERY_NOT_CONFIGURED",
      error:
        "Email delivery is not configured yet. Add a supported email provider before requesting a verification code.",
    });
    return;
  }

  try {
    const now = Date.now();
    const isTestEmail = isTestVerificationEmail(email);
    const requestIp = getRequestIp(req);
    if (!isTestEmail) {
      const [latest] = await db
        .select({ createdAt: authEmailCodesTable.createdAt })
        .from(authEmailCodesTable)
        .where(
          and(
            eq(authEmailCodesTable.email, email),
            eq(authEmailCodesTable.purpose, purpose),
          ),
        )
        .orderBy(desc(authEmailCodesTable.createdAt))
        .limit(1);

      if (latest && now - latest.createdAt.getTime() < AUTH_RESEND_INTERVAL_MS) {
        rateLimitResponse(
          res,
          Math.ceil((AUTH_RESEND_INTERVAL_MS - (now - latest.createdAt.getTime())) / 1000),
        );
        return;
      }

      const hourAgo = new Date(now - 60 * 60 * 1000);
      const [recent] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(authEmailCodesTable)
        .where(
          and(
            eq(authEmailCodesTable.email, email),
            eq(authEmailCodesTable.purpose, purpose),
            gt(authEmailCodesTable.createdAt, hourAgo),
          ),
        );
      if ((recent?.count ?? 0) >= AUTH_MAX_CODES_PER_HOUR) {
        rateLimitResponse(res, 3600);
        return;
      }

      if (requestIp) {
        const [recentIp] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(authEmailCodesTable)
          .where(
            and(
              eq(authEmailCodesTable.requestIp, requestIp),
              gt(authEmailCodesTable.createdAt, hourAgo),
            ),
          );
        if ((recentIp?.count ?? 0) >= AUTH_MAX_CODES_PER_HOUR * 4) {
          rateLimitResponse(res, 3600);
          return;
        }
      }
    }

    const code = generateVerificationCode();
    const { hash, salt } = hashVerificationCode(code);
    await sendVerificationEmail({ to: email, code });
    await db.insert(authEmailCodesTable).values({
      email,
      purpose,
      codeHash: hash,
      codeSalt: salt,
      expiresAt: new Date(now + AUTH_CODE_TTL_MS),
      requestIp,
    });

    res.json({
      success: true,
      next: "code",
      message: "If the address is eligible, a verification code was sent.",
    });
  } catch (error) {
    if (error instanceof EmailDeliveryNotConfiguredError) {
      res.status(503).json({
        success: false,
        code: "EMAIL_DELIVERY_NOT_CONFIGURED",
        error:
          "Email delivery is not configured yet. Add a supported email provider before requesting a verification code.",
      });
      return;
    }
    if (error instanceof EmailDeliveryFailedError) {
      res.status(502).json({ success: false, error: error.message });
      return;
    }
    req.log.error({ error }, "POST /auth/request-code failed");
    res.status(500).json({ success: false, error: "Could not start verification." });
  }
});

router.post("/auth/verify-code", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const purpose = parsePurpose(req.body?.purpose);
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (!email || !purpose || !/^\d{6}$/.test(code)) {
    res.status(400).json({
      success: false,
      code: "CODE_INVALID_OR_EXPIRED",
      error: "That verification code is invalid or expired.",
    });
    return;
  }

  try {
    const [challenge] = await db
      .select()
      .from(authEmailCodesTable)
      .where(
        and(
          eq(authEmailCodesTable.email, email),
          eq(authEmailCodesTable.purpose, purpose),
          isNull(authEmailCodesTable.consumedAt),
        ),
      )
      .orderBy(desc(authEmailCodesTable.createdAt))
      .limit(1);

    const now = new Date();
    const invalid = !challenge || challenge.expiresAt <= now || challenge.attemptCount >= AUTH_MAX_ATTEMPTS;
    if (invalid || !verifyVerificationCode(code, challenge.codeHash, challenge.codeSalt)) {
      if (challenge && challenge.expiresAt > now && challenge.attemptCount < AUTH_MAX_ATTEMPTS) {
        const nextAttempts = challenge.attemptCount + 1;
        await db
          .update(authEmailCodesTable)
          .set({
            attemptCount: sql`${authEmailCodesTable.attemptCount} + 1`,
            consumedAt: nextAttempts >= AUTH_MAX_ATTEMPTS ? now : null,
          })
          .where(eq(authEmailCodesTable.id, challenge.id));
      }
      res.status(400).json({
        success: false,
        code: "CODE_INVALID_OR_EXPIRED",
        error: "That verification code is invalid or expired.",
      });
      return;
    }

    await db
      .update(authEmailCodesTable)
      .set({ consumedAt: now })
      .where(eq(authEmailCodesTable.id, challenge.id));

    let [user] = await db
      .select()
      .from(usersTable)
      .where(userByEmail(email))
      .limit(1);

    if (!user) {
      const [createdUser] = await db
        .insert(usersTable)
        .values({ email })
        .onConflictDoNothing({ target: usersTable.email })
        .returning();
      user = createdUser;
    }
    if (!user) {
      [user] = await db
        .select()
        .from(usersTable)
        .where(userByEmail(email))
        .limit(1);
    }
    if (!user) {
      throw new Error("Could not resolve authenticated account");
    }

    req.session.authUserId = user.id;
    req.session.userId = user.id;
    req.session.sessionEstablished = true;
    await saveSession(req);

    res.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      },
    });
  } catch (error) {
    req.log.error({ error }, "POST /auth/verify-code failed");
    res.status(500).json({ success: false, error: "Could not finish verification." });
  }
});

router.post("/auth/logout", async (req, res) => {
  try {
    await destroySession(req);
    res.clearCookie("connect.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    res.json({ success: true });
  } catch (error) {
    req.log.error({ error }, "POST /auth/logout failed");
    res.status(500).json({ success: false, error: "Could not sign out." });
  }
});

export default router;