import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.VITEST = "true";
process.env.AI_PROVIDER = "fallback";

describe("runBatch manifest targets", () => {
  let tmpOut: string;
  let assessmentBefore: string | null = null;

  beforeEach(async () => {
    tmpOut = path.join(os.tmpdir(), `vf-manifest-test-${Date.now()}`);
    await fs.mkdir(tmpOut, { recursive: true });
    process.env.OUTPUT_DIR = tmpOut;
    const assessmentPath = path.join(tmpOut, "assessment", "manifest.json");
    await fs.mkdir(path.dirname(assessmentPath), { recursive: true });
    assessmentBefore = JSON.stringify({ marker: "keep-assessment", entries: [] });
    await fs.writeFile(assessmentPath, assessmentBefore, "utf8");
  });

  afterEach(async () => {
    delete process.env.OUTPUT_DIR;
    await fs.rm(tmpOut, { recursive: true, force: true });
  });

  it("targeted batch writes runs manifest and does not overwrite assessment", async () => {
    vi.resetModules();
    const { runBatch } = await import("./pipeline.js");
    const manifest = await runBatch({
      segments: [{ category: "healthcare", layoutFamily: "quote-banner", count: 1 }],
      seed: 1,
    });
    expect(manifest.collection).toBe("targeted");
    expect(manifest.batchRunId).toBeTruthy();

    const assessmentRaw = await fs.readFile(path.join(tmpOut, "assessment", "manifest.json"), "utf8");
    expect(assessmentRaw).toBe(assessmentBefore);

    const runPath = path.join(tmpOut, "runs", manifest.batchRunId!, "manifest.json");
    const runRaw = await fs.readFile(runPath, "utf8");
    const runManifest = JSON.parse(runRaw);
    expect(runManifest.entries.length).toBe(1);
  });

  it("assessment batch stages without overwriting canonical until promotion", async () => {
    vi.resetModules();
    const { runBatch } = await import("./pipeline.js");
    const { promoteAssessmentStaging, getAssessmentStagingDir } = await import(
      "./assessment-staging.js"
    );
    const { assertAssessmentBatchForPromotion } = await import("./batch-gates.js");

    const stagingId = "test-staging-run";
    const manifest = await runBatch(
      { count: 1, seed: 2 },
      undefined,
      undefined,
      { assessmentStagingRunId: stagingId },
    );
    expect(manifest.collection).toBe("assessment");

    const assessmentRaw = await fs.readFile(path.join(tmpOut, "assessment", "manifest.json"), "utf8");
    expect(assessmentRaw).toBe(assessmentBefore);

    const stagedManifest = await fs.readFile(
      path.join(getAssessmentStagingDir(stagingId), "manifest.json"),
      "utf8",
    );
    expect(JSON.parse(stagedManifest).entries.length).toBe(1);

    assertAssessmentBatchForPromotion(manifest);
    await promoteAssessmentStaging(stagingId, manifest);

    const after = await fs.readFile(path.join(tmpOut, "assessment", "manifest.json"), "utf8");
    expect(JSON.parse(after).entries.length).toBe(1);
    expect(after).not.toBe(assessmentBefore);
  });
});
