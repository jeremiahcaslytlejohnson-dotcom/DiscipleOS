import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { sendAccountScopedTestPush } from "../services/accountPushTest";

const router = Router();
const ACCOUNT_SCOPED_TEST_EMAIL = "manandhismountain@gmail.com";

function userDiagnosticKey(userId: string): string {
  return `user_${createHash("sha256").update(userId).digest("hex").slice(0, 16)}`;
}

// Both diagnostic paths are restricted to the configured test account. No
// request field can select a recipient, and no route broadcasts to users.
async function sendTestPushToAuthorizedAccount(req: any, res: any) {
  const secret = req.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  const body = req.body;
  if (
    body !== undefined &&
    body !== null &&
    (typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length > 0)
  ) {
    res.status(400).json({
      success: false,
      error: "This test has a fixed account target and accepts no target override.",
    });
    return;
  }

  try {
    const matchingUsers = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`lower(${usersTable.email}) = ${ACCOUNT_SCOPED_TEST_EMAIL}`)
      .limit(2);

    if (matchingUsers.length === 0) {
      res.status(404).json({
        success: false,
        outcome: "account_not_found",
        message: "Target account was not found; no notifications were sent.",
      });
      return;
    }

    if (matchingUsers.length !== 1) {
      res.status(409).json({
        success: false,
        outcome: "account_ambiguous",
        message: "Target account matched multiple records; no notifications were sent.",
      });
      return;
    }

    const target = matchingUsers[0];
    const result = await sendAccountScopedTestPush(target.id);
    if (result.registrations === 0) {
      res.status(409).json({
        success: false,
        outcome: "no_registrations",
        registrations: 0,
        devices: [],
        message: "Target account has no registered devices; no notifications were sent.",
      });
      return;
    }

    const accepted = result.devices.filter(
      (device) => device.providerAccepted,
    ).length;
    req.log.info(
      {
        event: "account_scoped_push_test_completed",
        targetUserKey: userDiagnosticKey(target.id),
        registrations: result.registrations,
        providerAccepted: accepted,
        failed: result.devices.length - accepted,
      },
      "Account-scoped push test completed",
    );
    res.json({
      success: accepted === result.registrations,
      outcome: "completed",
      scope: "one_account",
      registrations: result.registrations,
      providerAccepted: accepted,
      failed: result.devices.length - accepted,
      devices: result.devices,
    });
  } catch (error) {
    const candidate = error as {
      name?: unknown;
      statusCode?: unknown;
    } | null;
    req.log.error(
      {
        event: "account_scoped_push_test_failed",
        errorName:
          typeof candidate?.name === "string"
            ? candidate.name
            : "UnknownError",
        statusCode:
          typeof candidate?.statusCode === "number"
            ? candidate.statusCode
            : undefined,
      },
      "Account-scoped push test failed",
    );
    res.status(500).json({
      success: false,
      error: "Account-scoped push test failed before completion.",
    });
  }
}

router.post("/push/test", sendTestPushToAuthorizedAccount);
router.post("/push/test/account-scoped", sendTestPushToAuthorizedAccount);

export default router;
