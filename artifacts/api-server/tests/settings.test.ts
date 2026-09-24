import request from "supertest";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const authUser = vi.hoisted(() => ({ id: null as string | null }));

vi.mock("../src/middlewares/auth", () => ({
  attachCurrentUser: (req: any, _res: unknown, next: () => void) => {
    if (authUser.id) req.dbUser = { id: authUser.id };
    next();
  },
  requireAuth: (req: any, res: any, next: () => void) =>
    req.dbUser ? next() : res.status(401).json({ success: false, error: "Sign in required" }),
}));

import { createApp, createPgSessionStore } from "../src/app";
import { db, userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const app = createApp(createPgSessionStore());

describe("Account reading settings", () => {
  beforeEach(() => {
    authUser.id = null;
  });

  afterAll(async () => {
    await db.delete(userSettingsTable).where(eq(userSettingsTable.userId, "settings-user-a"));
    await db.delete(userSettingsTable).where(eq(userSettingsTable.userId, "settings-user-b"));
  });

  it("rejects anonymous reads and writes", async () => {
    const anonymous = request.agent(app);

    await anonymous.get("/api/settings").expect(401);
    await anonymous
      .put("/api/settings")
      .send({
        paceMode: "fast",
        customMinutesPerChapter: 4,
        dailyReadingBudget: 30,
        preferredReadingTime: "06:30",
        readingOrder: "randomized",
      })
      .expect(401);
  });

  it("persists valid defaults and keeps them isolated by account", async () => {
    const accountA = request.agent(app);
    const accountB = request.agent(app);

    authUser.id = "settings-user-a";
    const saved = await accountA
      .put("/api/settings")
      .send({
        paceMode: "custom",
        customMinutesPerChapter: 6,
        dailyReadingBudget: 25,
        preferredReadingTime: "06:45",
        readingOrder: "randomized",
      })
      .expect(200);

    expect(saved.body.settings).toEqual({
      paceMode: "custom",
      customMinutesPerChapter: 6,
      dailyReadingBudget: 25,
      preferredReadingTime: "06:45",
      readingOrder: "randomized",
    });

    authUser.id = "settings-user-b";
    const otherAccount = await accountB.get("/api/settings").expect(200);
    expect(otherAccount.body.settings).toEqual({
      paceMode: "standard",
      customMinutesPerChapter: 5,
      dailyReadingBudget: 20,
      preferredReadingTime: "07:00",
      readingOrder: "consecutive",
    });

    authUser.id = "settings-user-a";
    const restored = await accountA.get("/api/settings").expect(200);
    expect(restored.body.settings.paceMode).toBe("custom");
    expect(restored.body.settings.readingOrder).toBe("randomized");
  });
});