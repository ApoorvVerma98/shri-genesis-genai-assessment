import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import { createContentGenerator } from "@vector-forge/ai";
import { assessmentManifestRelPath, resolveBatchCollection } from "@vector-forge/shared";
import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  assertAssessmentBatchForPromotion,
} from "../batch-gates.js";
import {
  promoteAssessmentStaging,
  verifyStagingArtifacts,
} from "../assessment-staging.js";
import { registerBatchInterruptHandlers } from "../batch-interrupt.js";
import { writeBatchProgress } from "../batch-progress.js";
import { runBatch } from "../pipeline.js";
import {
  buildCompletedAssessmentReport,
  writeCompletedAssessmentReports,
  writeExecutionRun,
} from "../execution-run.js";

const count = Number(process.env.BATCH_SIZE ?? process.argv[2] ?? 100);
const seed = Number(process.argv[3] ?? 42);

async function main() {
  const gen = createContentGenerator();
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const collection = resolveBatchCollection({ count, seed });

  console.log("AI status:", {
    provider: gen.status().provider,
    configured: gen.status().configured,
    model: gen.status().model,
  });
  console.log(`Starting batch: ${count} designs (seed ${seed}) runId=${runId}`);

  let progressDone = 0;
  let progressTotal = count;
  let lastDetail: {
    designId: string;
    contentMode: string;
    stage: "complete" | "failed";
    fallbackReason?: string;
    index: number;
  } | undefined;

  registerBatchInterruptHandlers({
    runId,
    collection,
    requested: count,
    startedAt,
    getProgress: () => ({
      done: progressDone,
      total: progressTotal,
      last: lastDetail,
    }),
  });

  await writeExecutionRun({
    status: "in_progress",
    runId,
    collection,
    requested: count,
    startedAt,
    message:
      "Assessment batch in progress. Canonical collection is not updated until staging passes all gates and promotion succeeds.",
  });

  await writeBatchProgress({
    runId,
    collection,
    requested: count,
    done: 0,
    total: count,
    startedAt,
    updatedAt: startedAt,
    status: "in_progress",
  });

  try {
    const manifest = await runBatch(
      { count, seed },
      (done, total, detail) => {
        progressDone = done;
        progressTotal = total;
        if (detail) lastDetail = { ...detail, index: done };
        const line = `[${done}/${total}] ${detail?.designId ?? "?"} contentMode=${detail?.contentMode ?? "?"}${detail?.fallbackReason ? ` fallback=${detail.fallbackReason.slice(0, 80)}` : ""}`;
        console.log(line);
        void writeBatchProgress({
          runId,
          collection,
          requested: count,
          done,
          total,
          startedAt,
          updatedAt: new Date().toISOString(),
          last: detail ? { ...detail, index: done } : undefined,
          status: "in_progress",
        });
      },
      undefined,
      collection === "assessment" ? { assessmentStagingRunId: runId } : undefined,
    );

    if (collection === "assessment") {
      assertAssessmentBatchForPromotion(manifest);
      const missing = await verifyStagingArtifacts(runId, manifest);
      if (missing.length > 0) {
        throw new Error(`Staging incomplete: ${missing.slice(0, 5).join("; ")}`);
      }
      await promoteAssessmentStaging(runId, manifest);
    }

    if (collection === "assessment") {
      const report = buildCompletedAssessmentReport(
        runId,
        manifest,
        gen.status(),
        startedAt,
        path.join("outputs", assessmentManifestRelPath()).replace(/\\/g, "/"),
      );
      await writeCompletedAssessmentReports(report);
      await writeExecutionRun({
        status: "completed",
        runId,
        collection,
        requested: count,
        startedAt,
        completedAt: manifest.completedAt,
        manifestPath: report.canonicalManifestPath,
        manifestEntryCount: manifest.entries.length,
      });
      await writeBatchProgress({
        runId,
        collection,
        requested: count,
        done: manifest.attempted,
        total: manifest.requested,
        startedAt,
        updatedAt: new Date().toISOString(),
        status: "completed",
      });
      console.log("Batch complete:", {
        runId,
        aiGeneratedCount: report.aiGeneratedCount,
        fallbackCount: report.fallbackCount,
        validationPassed: report.validationPassed,
      });
    } else {
      await writeExecutionRun({
        status: "completed",
        runId,
        collection,
        requested: manifest.requested,
        startedAt,
        completedAt: manifest.completedAt,
        manifestPath: `outputs/runs/${manifest.batchRunId}/manifest.json`,
        manifestEntryCount: manifest.entries.length,
      });
      await writeBatchProgress({
        runId,
        collection,
        requested: manifest.requested,
        done: manifest.attempted,
        total: manifest.requested,
        startedAt,
        updatedAt: new Date().toISOString(),
        status: "completed",
      });
      console.log("Targeted batch complete:", { runId, batchRunId: manifest.batchRunId });
    }
    console.log(`Execution run record: reports/execution-run.json`);
    console.log(`Batch progress: reports/batch-progress.json`);
    if (collection === "assessment") {
      console.log(`Execution report: reports/execution-report.json`);
    }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await writeBatchProgress({
      runId,
      collection,
      requested: count,
      done: progressDone,
      total: progressTotal,
      startedAt,
      updatedAt: new Date().toISOString(),
      status: "failed",
      error,
    });
    await writeExecutionRun({
      status: "failed",
      runId,
      collection,
      requested: count,
      startedAt,
      completedAt: new Date().toISOString(),
      error,
      message:
        collection === "assessment"
          ? "Assessment batch failed or was interrupted. Canonical collection was not promoted; prior manifest and SVGs remain active."
          : "Batch failed or was interrupted before completion. Prior execution-report.json was not replaced.",
    });
    throw e;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
