import fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EXECUTION_RUN_PATH,
  readExecutionRun,
  reconcileStaleExecutionRun,
  writeExecutionRun,
} from "./execution-run.js";

describe("execution-run", () => {
  let backup: string | null = null;

  beforeEach(async () => {
    try {
      backup = await fs.readFile(EXECUTION_RUN_PATH, "utf8");
    } catch {
      backup = null;
    }
  });

  afterEach(async () => {
    if (backup === null) {
      await fs.unlink(EXECUTION_RUN_PATH).catch(() => undefined);
    } else {
      await fs.writeFile(EXECUTION_RUN_PATH, backup, "utf8");
    }
  });

  it("reconcileStaleExecutionRun marks old in_progress as failed", async () => {
    await writeExecutionRun({
      status: "in_progress",
      runId: "stale-test",
      collection: "assessment",
      requested: 100,
      startedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    });
    const updated = await reconcileStaleExecutionRun();
    expect(updated?.status).toBe("failed");
    expect(updated?.error).toMatch(/interrupted|stale/i);
    const reread = await readExecutionRun();
    expect(reread?.status).toBe("failed");
  });

  it("does not reconcile recent in_progress", async () => {
    await writeExecutionRun({
      status: "in_progress",
      runId: "fresh",
      collection: "assessment",
      requested: 5,
      startedAt: new Date().toISOString(),
    });
    const updated = await reconcileStaleExecutionRun();
    expect(updated?.status).toBe("in_progress");
  });
});
