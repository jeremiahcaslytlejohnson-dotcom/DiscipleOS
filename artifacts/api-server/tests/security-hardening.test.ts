import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp, createPgSessionStore } from "../src/app";

const app = createApp(createPgSessionStore());
const clientIp = () => `198.51.100.${Math.floor(Math.random() * 200) + 1}`;

describe("state-changing request and analytics protections", () => {
  it("rejects cross-origin and Fetch-Metadata cross-site mutations", async () => {
    await request(app)
      .post("/api/track")
      .set("Origin", "https://attacker.example")
      .set("X-Forwarded-For", clientIp())
      .send({ event: "page_view" })
      .expect(403);

    await request(app)
      .post("/api/track")
      .set("Sec-Fetch-Site", "cross-site")
      .set("X-Forwarded-For", clientIp())
      .send({ event: "page_view" })
      .expect(403);
  });

  it("accepts a valid same-origin analytics event without logging or storing its properties", async () => {
    await request(app)
      .post("/api/track")
      .set("Host", "discipleos.test")
      .set("Origin", "http://discipleos.test")
      .set("X-Forwarded-For", clientIp())
      .send({ event: "page_view", properties: { section: "calendar" } })
      .expect(200, { success: true });
  });

  it("rejects malformed and oversized analytics submissions", async () => {
    await request(app)
      .post("/api/track")
      .set("X-Forwarded-For", clientIp())
      .send({ event: "not allowed!", properties: { secret: "x" } })
      .expect(400);

    await request(app)
      .post("/api/track")
      .set("X-Forwarded-For", clientIp())
      .send({ event: "large", properties: { data: "x".repeat(9_000) } })
      .expect(413);
  });

  it("limits analytics events per client IP", async () => {
    const clientIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    let lastStatus = 0;
    for (let i = 0; i < 31; i++) {
      const response = await request(app)
        .post("/api/track")
        .set("X-Forwarded-For", clientIp)
        .send({ event: "test_event" });
      lastStatus = response.status;
    }
    expect(lastStatus).toBe(429);
  });
});
