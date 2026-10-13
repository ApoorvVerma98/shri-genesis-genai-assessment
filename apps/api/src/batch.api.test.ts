import { describe, expect, it } from "vitest";
import request from "supertest";

process.env.VITEST = "true";

const { app } = await import("./index.js");

describe("POST /api/batch validation", () => {
  it("rejects invalid segment category", async () => {
    const res = await request(app)
      .post("/api/batch")
      .send({
        segments: [{ category: "nope", layoutFamily: "promotional-banner", count: 1 }],
      });
    expect(res.status).toBe(400);
  });

  it("rejects count mismatch with segments", async () => {
    const res = await request(app)
      .post("/api/batch")
      .send({
        count: 100,
        segments: [{ category: "technology", layoutFamily: "promotional-banner", count: 50 }],
      });
    expect(res.status).toBe(400);
  });

  it("rejects zero count legacy payload", async () => {
    const res = await request(app).post("/api/batch").send({ count: 0 });
    expect(res.status).toBe(400);
  });

  it("rejects assessment collection regeneration via API", async () => {
    const res = await request(app).post("/api/batch").send({ count: 5, seed: 1 });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/disabled via API/i);
  });
});
