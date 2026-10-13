import type { ExecutionRunRecord } from "./execution-run.js";
import { writeExecutionRun } from "./execution-run.js";
import { writeBatchProgress, type BatchProgressFile } from "./batch-progress.js";

export interface BatchInterruptContext {
  runId: string;
  collection: "assessment" | "targeted";
  requested: number;
  startedAt: string;
  getProgress: () => Pick<BatchProgressFile, "done" | "total" | "last">;
}

let registered = false;

/** Mark execution run failed on SIGINT/SIGTERM (CLI assessment batches). */
export function registerBatchInterruptHandlers(ctx: BatchInterruptContext): void {
  if (registered) return;
  registered = true;

  const fail = async (signal: string) => {
    const prog = ctx.getProgress();
    const error = `Batch interrupted (${signal}) after ${prog.done}/${prog.total} designs`;
    const record: ExecutionRunRecord = {
      status: "failed",
      runId: ctx.runId,
      collection: ctx.collection,
      requested: ctx.requested,
      startedAt: ctx.startedAt,
      completedAt: new Date().toISOString(),
      error,
      message:
        "Batch did not complete; execution-report.json was not updated for this run.",
    };
    try {
      await writeExecutionRun(record);
      await writeBatchProgress({
        runId: ctx.runId,
        collection: ctx.collection,
        requested: ctx.requested,
        done: prog.done,
        total: prog.total,
        startedAt: ctx.startedAt,
        updatedAt: new Date().toISOString(),
        last: prog.last,
        status: "interrupted",
        error,
      });
    } catch {
      /* best effort */
    }
    process.exit(signal === "SIGINT" ? 130 : 1);
  };

  process.once("SIGINT", () => {
    void fail("SIGINT");
  });
  process.once("SIGTERM", () => {
    void fail("SIGTERM");
  });
}

/** @internal test helper */
export function resetBatchInterruptRegistration(): void {
  registered = false;
}
