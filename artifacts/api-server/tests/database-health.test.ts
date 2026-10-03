import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { pool } from "@workspace/db";
import app from "../src/app";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("database pool error handling", () => {
  it("logs an idle-client termination without crashing or exposing the message", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const idleClientError = Object.assign(
      new Error("database connection details must stay private"),
      { code: "57P01" },
    );

    expect(pool.listenerCount("error")).toBeGreaterThan(0);
    expect(() =>
      pool.emit("error", idleClientError, {} as never),
    ).not.toThrow();
    expect(logSpy).toHaveBeenCalledWith(
      "[database] idle PostgreSQL pool client error",
      { errorName: "Error", errorCode: "57P01" },
    );
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain(
      idleClientError.message,
    );
  });

  it("does not swallow failures from active database queries", async () => {
    const queryFailure = new Error("query failure");
    vi.spyOn(pool, "query").mockRejectedValueOnce(queryFailure);

    await expect(pool.query("SELECT 1")).rejects.toBe(queryFailure);
  });
});

describe("API database readiness probes", () => {
  it("returns the same database-ready response at /api and /api/healthz", async () => {
    const querySpy = vi
      .spyOn(pool, "query")
      .mockResolvedValue({ rows: [{ "?column?": 1 }] } as never);

    const rootResponse = await request(app)
      .get("/api")
      .expect(200);
    const healthResponse = await request(app)
      .get("/api/healthz")
      .expect(200);

    expect(rootResponse.body).toEqual({ status: "ok" });
    expect(healthResponse.body).toEqual({ status: "ok" });
    expect(rootResponse.headers["set-cookie"]).toBeUndefined();
    expect(healthResponse.headers["set-cookie"]).toBeUndefined();
    expect(querySpy).toHaveBeenCalledTimes(2);
    expect(querySpy).toHaveBeenNthCalledWith(1, "SELECT 1");
    expect(querySpy).toHaveBeenNthCalledWith(2, "SELECT 1");
  });

  it("returns 503 when PostgreSQL is unavailable instead of reporting readiness", async () => {
    const querySpy = vi
      .spyOn(pool, "query")
      .mockRejectedValue(new Error("database unavailable"));

    const rootResponse = await request(app)
      .get("/api")
      .expect(503);
    const healthResponse = await request(app)
      .get("/api/healthz")
      .expect(503);

    expect(rootResponse.body).toEqual({
      status: "not_ready",
      dependency: "database",
    });
    expect(healthResponse.body).toEqual({
      status: "not_ready",
      dependency: "database",
    });
    expect(querySpy).toHaveBeenCalledTimes(2);
  });
});