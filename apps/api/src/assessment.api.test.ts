import { describe, expect, it } from "vitest";
import request from "supertest";

process.env.VITEST = "true";

const { app } = await import("./index.js");

describe("assessment API", () => {
  it("GET /api/assessment/overview returns provenance", async () => {
    const res = await request(app).get("/api/assessment/overview");
    expect(res.status).toBe(200);
    expect(res.body.designCount).toBe(100);
    expect(res.body.provenance).toBeDefined();
    expect(typeof res.body.provenanceResolved).toBe("boolean");
  });

  it("GET /api/assessment/traceability returns requirements", async () => {
    const res = await request(app).get("/api/assessment/traceability");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.requirements)).toBe(true);
    expect(res.body.requirements.length).toBeGreaterThan(0);
  });
});
