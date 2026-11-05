import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeDatabase = vi.hoisted(() => {
  let authReadTarget = 0;
  let authReadCount = 0;
  let authReadBarrier: Promise<void> | undefined;
  let releaseAuthReads: (() => void) | undefined;

  return {
    codes: [] as Array<Record<string, any>>,
    users: [] as Array<Record<string, any>>,
    locks: new Map<string, Promise<void>>(),
    reset() {
      this.codes.length = 0;
      this.users.length = 0;
      this.locks.clear();
      authReadTarget = 0;
      authReadCount = 0;
      authReadBarrier = undefined;
      releaseAuthReads = undefined;
    },
    holdNextAuthReads(count: number) {
      authReadTarget = count;
      authReadCount = 0;
      authReadBarrier = new Promise<void>((resolve) => {
        releaseAuthReads = resolve;
      });
    },
    async waitForAuthReadBarrier() {
      if (!authReadBarrier) return;
      authReadCount += 1;
      if (authReadCount === authReadTarget) releaseAuthReads?.();
      await authReadBarrier;
    },
  };
});

vi.mock("@workspace/db", () => {
  const makeTable = (name: string, columns: string[]) => ({
    __name: name,
    ...Object.fromEntries(columns.map((column) => [column, { name: column }])),
  });
  const authEmailCodesTable = makeTable("authEmailCodes", [
    "id",
    "email",
    "purpose",
    "codeHash",
    "codeSalt",
    "expiresAt",
    "consumedAt",
    "attemptCount",
    "requestIp",
    "createdAt",
  ]);
  const usersTable = makeTable("users", [
    "id",
    "email",
    "firstName",
    "lastName",
    "profileImageUrl",
  ]);
  const eventsTable = makeTable("events", ["id", "userId"]);
  const readingPlansTable = makeTable("readingPlans", ["id", "userId", "data"]);
  const pushSubscriptionsTable = makeTable("pushSubscriptions", ["id", "userId"]);
  const deletedEventTombstonesTable = makeTable("deletedEventTombstones", ["id", "userId"]);
  const emptyTable = makeTable("empty", ["id"]);

  function matches(row: Record<string, any>, condition: any): boolean {
    if (!condition) return true;
    if (Array.isArray(condition)) return condition.every((item) => matches(row, item));
    if (condition.op === "and") {
      return condition.conditions.every((item: any) => matches(row, item));
    }
    if (condition.op === "sql") return true;
    const actual = row[condition.column];
    if (condition.op === "eq") return actual === condition.value;
    if (condition.op === "isNull") return actual == null;
    if (condition.op === "gt") return actual > condition.value;
    if (condition.op === "lt") return actual < condition.value;
    return true;
  }

  function makeClient(releases: Array<() => void> = []) {
    const client: any = {
      select(selection?: Record<string, unknown>) {
        let table: any;
        let condition: any;
        const query: any = {
          from(value: any) {
            table = value;
            return query;
          },
          where(value: any) {
            condition = value;
            return query;
          },
          orderBy() {
            return query;
          },
          async limit(limit: number) {
            return readRows(limit);
          },
          then(resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) {
            return readRows().then(resolve, reject);
          },
        };

        async function readRows(limit?: number) {
          if (table === authEmailCodesTable && !selection?.count && !selection?.createdAt) {
            await fakeDatabase.waitForAuthReadBarrier();
          }
          const source =
            table === authEmailCodesTable
              ? fakeDatabase.codes
              : table === usersTable
                ? fakeDatabase.users
                : [];
          const filtered = source.filter((row) => matches(row, condition));
          if (selection?.count) return [{ count: filtered.length }];
          if (selection?.createdAt) {
            return filtered
              .slice(0, limit)
              .map(({ createdAt }) => ({ createdAt }));
          }
          const result = filtered.map((row) => structuredClone(row));
          return typeof limit === "number" ? result.slice(0, limit) : result;
        }

        return query;
      },
      update(table: any) {
        return {
          set(values: Record<string, any>) {
            let updated: Record<string, any>[] = [];
            const query: any = {
              where(condition: any) {
                const rows =
                  table === authEmailCodesTable
                    ? fakeDatabase.codes
                    : table === usersTable
                      ? fakeDatabase.users
                      : [];
                const row = rows.find((candidate) => matches(candidate, condition));
                if (row) {
                  if (values.attemptCount?.op === "sql") {
                    row.attemptCount += 1;
                    row.consumedAt =
                      row.attemptCount >= 5 ? new Date() : null;
                  } else {
                    Object.assign(row, values);
                  }
                  updated = [row];
                }
                return query;
              },
              async returning() {
                return updated.map(({ id }) => ({ id }));
              },
              then(resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) {
                return Promise.resolve(updated).then(resolve, reject);
              },
            };
            return query;
          },
        };
      },
      insert(table: any) {
        return {
          values(values: Record<string, any>) {
            return {
              async returning() {
                if (table === authEmailCodesTable) {
                  const id = `fixture-code-${fakeDatabase.codes.length + 1}`;
                  fakeDatabase.codes.push({
                    id,
                    consumedAt: null,
                    attemptCount: 0,
                    createdAt: new Date(),
                    ...values,
                  });
                  return [{ id }];
                }
                if (table === usersTable) {
                  const user = { id: `fixture-user-${fakeDatabase.users.length + 1}`, ...values };
                  fakeDatabase.users.push(user);
                  return [structuredClone(user)];
                }
                return [];
              },
              async onConflictDoNothing() {
                return undefined;
              },
            };
          },
        };
      },
      delete(table: any) {
        return {
          where(condition: any) {
            const rows = table === authEmailCodesTable ? fakeDatabase.codes : [];
            const remaining = rows.filter((row) => !matches(row, condition));
            rows.splice(0, rows.length, ...remaining);
            return Promise.resolve();
          },
        };
      },
    };

    if (releases) {
      client.execute = async (query: any) => {
        const key = String(query.values?.[0] ?? "");
        const previous = fakeDatabase.locks.get(key) ?? Promise.resolve();
        let release!: () => void;
        const current = new Promise<void>((resolve) => {
          release = resolve;
        });
        fakeDatabase.locks.set(key, current);
        await previous;
        releases.push(() => {
          release();
          if (fakeDatabase.locks.get(key) === current) fakeDatabase.locks.delete(key);
        });
        return [];
      };
    }

    return client;
  }

  const db = makeClient();
  db.transaction = async (callback: (tx: any) => Promise<unknown>) => {
    const releases: Array<() => void> = [];
    try {
      return await callback(makeClient(releases));
    } finally {
      releases.reverse().forEach((release) => release());
    }
  };

  return {
    db,
    authEmailCodesTable,
    usersTable,
    eventsTable,
    readingPlansTable,
    pushSubscriptionsTable,
    deletedEventTombstonesTable,
    sessionTable: emptyTable,
    userSettingsTable: emptyTable,
    sentRemindersTable: emptyTable,
    legacyAuthIdentitiesTable: emptyTable,
    feedbackTable: emptyTable,
  };
});

vi.mock("drizzle-orm", () => ({
  and: (...conditions: any[]) => ({ op: "and", conditions }),
  desc: (column: any) => ({ op: "desc", column }),
  eq: (column: any, value: unknown) => ({ op: "eq", column: column?.name, value }),
  gt: (column: any, value: unknown) => ({ op: "gt", column: column?.name, value }),
  inArray: () => ({ op: "noop" }),
  isNull: (column: any) => ({ op: "isNull", column: column?.name }),
  lt: (column: any, value: unknown) => ({ op: "lt", column: column?.name, value }),
  or: (...conditions: any[]) => ({ op: "or", conditions }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    op: "sql",
    text: strings.join("?"),
    values,
  }),
}));

const delivery = vi.hoisted(() => ({
  sendVerificationEmail: vi.fn(async () => undefined),
}));

vi.mock("../src/services/emailDelivery", () => ({
  EmailDeliveryFailedError: class EmailDeliveryFailedError extends Error {},
  EmailDeliveryNotConfiguredError: class EmailDeliveryNotConfiguredError extends Error {},
  clearTestVerificationCode: vi.fn(),
  isEmailDeliveryConfigured: () => true,
  isTestVerificationEmail: () => false,
  sendVerificationEmail: delivery.sendVerificationEmail,
  takeTestVerificationCode: vi.fn(() => null),
}));

import authRouter from "../src/routes/auth";
import accountRouter from "../src/routes/account";
import { AUTH_CODE_TTL_MS, AUTH_MAX_CODES_PER_HOUR, hashVerificationCode } from "../src/lib/auth-codes";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    Object.defineProperty(req, "ip", { value: "198.51.100.44", configurable: true });
    req.session = {
      anonymousUserId: "anonymous-fixture",
      regenerate(callback: (error?: Error | null) => void) {
        callback(null);
      },
      save(callback: (error?: Error | null) => void) {
        callback(null);
      },
    };
    req.dbUser = undefined;
    req.log = { error: vi.fn(), warn: vi.fn(), info: vi.fn() };
    next();
  });
  app.use("/api", authRouter);
  app.use("/api", accountRouter);
  return app;
}

async function seedCode({
  email,
  code = "123456",
  expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS),
  requestIp = "198.51.100.44",
  createdAt = new Date(),
}: {
  email: string;
  code?: string;
  expiresAt?: Date;
  requestIp?: string;
  createdAt?: Date;
}) {
  const { hash, salt } = hashVerificationCode(code);
  fakeDatabase.codes.push({
    id: `seed-${fakeDatabase.codes.length + 1}`,
    email,
    purpose: "email",
    codeHash: hash,
    codeSalt: salt,
    expiresAt,
    consumedAt: null,
    attemptCount: 0,
    requestIp,
    createdAt,
  });
}

describe("isolated auth concurrency and authorization", () => {
  beforeEach(() => {
    fakeDatabase.reset();
    delivery.sendVerificationEmail.mockClear();
  });

  it("allows only one of two concurrent valid OTP verifications to consume the code", async () => {
    const email = "one-time@example.test";
    fakeDatabase.users.push({ id: "user-one", email });
    await seedCode({ email });
    fakeDatabase.holdNextAuthReads(2);
    const app = createApp();

    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        request(app)
          .post("/api/auth/verify-code")
          .send({ email, purpose: "email", code: "123456" }),
      ),
    );

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 400]);
    expect(fakeDatabase.codes[0].consumedAt).toBeInstanceOf(Date);
  });

  it("supports a normal login, rejects replay, and rejects expired codes", async () => {
    const email = "login@example.test";
    fakeDatabase.users.push({ id: "user-login", email });
    await seedCode({ email });
    await seedCode({
      email: "expired@example.test",
      expiresAt: new Date(Date.now() - 1_000),
    });
    const app = createApp();

    const first = await request(app)
      .post("/api/auth/verify-code")
      .send({ email, purpose: "email", code: "123456" })
      .expect(200);
    expect(first.body.user).toEqual(expect.objectContaining({ id: "user-login", email }));

    await request(app)
      .post("/api/auth/verify-code")
      .send({ email, purpose: "email", code: "123456" })
      .expect(400);
    await request(app)
      .post("/api/auth/verify-code")
      .send({ email: "expired@example.test", purpose: "email", code: "123456" })
      .expect(400);
  });

  it("serializes concurrent code requests for the same email", async () => {
    const app = createApp();
    const responses = await Promise.all(
      Array.from({ length: 2 }, () =>
        request(app)
          .post("/api/auth/request-code")
          .send({ email: "same@example.test", purpose: "email" }),
      ),
    );

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 429]);
    expect(delivery.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it("allows only one concurrent request to use the final IP quota slot", async () => {
    const app = createApp();
    for (let index = 0; index < AUTH_MAX_CODES_PER_HOUR * 4 - 1; index += 1) {
      await seedCode({
        email: `prior-${index}@example.test`,
        createdAt: new Date(Date.now() - 10_000),
      });
    }

    const responses = await Promise.all(
      ["new-a@example.test", "new-b@example.test"].map((email) =>
        request(app).post("/api/auth/request-code").send({ email, purpose: "email" }),
      ),
    );

    expect(responses.map(({ status }) => status).sort()).toEqual([200, 429]);
    expect(delivery.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it("blocks anonymous sessions from claiming account data", async () => {
    await request(createApp())
      .post("/api/account/claim")
      .expect(401, { success: false, error: "Sign in required" });
  });
});
