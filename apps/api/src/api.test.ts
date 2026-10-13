import { describe, expect, it } from "vitest";
import request from "supertest";

process.env.VITEST = "true";

const { app } = await import("./index.js");

describe("API", () => {
  it("health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("meta lists categories", async () => {
    const res = await request(app).get("/api/meta");
    expect(res.status).toBe(200);
    expect(res.body.categories.length).toBeGreaterThan(8);
  });

  it("rejects invalid batch payload", async () => {
    const res = await request(app).post("/api/batch").send({ count: 0 });
    expect(res.status).toBe(400);
  });

  it("blocks path traversal for svg", async () => {
    const res = await request(app).get("/api/svg/../../package.json");
    expect(res.status).toBe(400);
  });
});
