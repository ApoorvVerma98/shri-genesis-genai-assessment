import { describe, expect, it, vi } from "vitest";
import { registerBatchInterruptHandlers, resetBatchInterruptRegistration } from "./batch-interrupt.js";
import * as executionRun from "./execution-run.js";
import * as batchProgress from "./batch-progress.js";

describe("registerBatchInterruptHandlers", () => {
  it("writes failed execution run and interrupted progress on SIGINT", async () => {
    resetBatchInterruptRegistration();
    const writeRun = vi.spyOn(executionRun, "writeExecutionRun").mockResolvedValue();
    const writeProg = vi.spyOn(batchProgress, "writeBatchProgress").mockResolvedValue();
    const exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as typeof process.exit);

    registerBatchInterruptHandlers({
      runId: "run-1",
      collection: "assessment",
      requested: 100,
      startedAt: new Date().toISOString(),
      getProgress: () => ({ done: 3, total: 100, last: { designId: "vf-x", contentMode: "ai", stage: "complete", index: 3 } }),
    });

    process.emit("SIGINT");

    await vi.waitFor(() => {
      expect(writeRun).toHaveBeenCalled();
      expect(exit).toHaveBeenCalledWith(130);
    });

    const record = writeRun.mock.calls[0]?.[0];
    expect(record?.status).toBe("failed");
    expect(record?.error).toMatch(/SIGINT/);
    expect(writeProg).toHaveBeenCalled();
    expect(writeProg.mock.calls[0]?.[0].status).toBe("interrupted");

    writeRun.mockRestore();
    writeProg.mockRestore();
    exit.mockRestore();
    resetBatchInterruptRegistration();
  });
});
