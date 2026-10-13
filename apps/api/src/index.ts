import { bootstrapEnv } from "./config/bootstrap-env.js";

bootstrapEnv();
import { createContentGenerator } from "@vector-forge/ai";
import {
  CATEGORIES,
  LAYOUT_FAMILIES,
  BatchJobRequestSchema,
  resolveBatchCollection,
  resolveBatchJob,
  SingleGenerateRequestSchema,
  buildSingleDesignSeed,
} from "@vector-forge/shared";
import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import { generateOne, runBatch } from "./pipeline.js";
import {
  listTargetedRunIds,
  readAssessmentManifest,
  readTargetedManifest,
} from "./manifest-io.js";
import { buildAssessmentTraceability } from "./assessment-audit.js";
import { readExecutionRun, reconcileStaleExecutionRun } from "./execution-run.js";
import { resolvePublicPath, REPORTS_DIR } from "./paths.js";
import path from "node:path";

const app = express();
app.use(cors());
app.use(express.json());

let batchState: {
  running: boolean;
  progress: number;
  total: number;
  collection?: "assessment" | "targeted";
  batchRunId?: string;
  lastError?: string;
  currentDesignId?: string;
  currentContentMode?: string;
  currentStage?: string;
  lastFallbackReason?: string;
} = { running: false, progress: 0, total: 0 };

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/meta", (_req, res) => {
  const gen = createContentGenerator();
  res.json({
    categories: CATEGORIES,
    layoutFamilies: LAYOUT_FAMILIES,
    ai: gen.status(),
  });
});

app.get("/api/ai/probe", async (_req, res) => {
  const gen = createContentGenerator();
  const status = await gen.probe();
  res.json(status);
});

app.get("/api/manifest", async (req, res) => {
  const collection = (req.query.collection as string) ?? "assessment";
  const runId = req.query.runId as string | undefined;

  if (collection === "targeted") {
    const ids = await listTargetedRunIds();
    const id = runId ?? ids[ids.length - 1];
    if (!id) {
      res.status(404).json({ error: "No targeted runs found." });
      return;
    }
    const manifest = await readTargetedManifest(id);
    if (!manifest) {
      res.status(404).json({ error: "Targeted manifest not found." });
      return;
    }
    res.json(manifest);
    return;
  }

  const manifest = await readAssessmentManifest();
  if (!manifest) {
    res.status(404).json({ error: "Assessment manifest not found." });
    return;
  }
  res.json(manifest);
});

app.get("/api/runs", async (_req, res) => {
  const ids = await listTargetedRunIds();
  res.json({ runs: ids });
});

app.get("/api/designs", async (req, res) => {
  const collection = (req.query.collection as string) ?? "assessment";
  const runId = req.query.runId as string | undefined;

  if (collection === "targeted") {
    const ids = await listTargetedRunIds();
    const id = runId ?? ids[ids.length - 1];
    if (!id) {
      res.json([]);
      return;
    }
    const manifest = await readTargetedManifest(id);
    res.json(manifest?.entries ?? []);
    return;
  }

  const manifest = await readAssessmentManifest();
  res.json(manifest?.entries ?? []);
});

app.get("/api/svg/*", async (req, res) => {
  const rel = req.path.replace(/^\/api\/svg\/?/, "");
  const full = resolvePublicPath(rel);
  if (!full) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }
  try {
    const svg = await fs.readFile(full, "utf8");
    res.type("image/svg+xml").send(svg);
  } catch {
    res.status(404).json({ error: "Not found" });
  }
});

app.post("/api/generate", async (req, res) => {
  const parsed = SingleGenerateRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const seed = buildSingleDesignSeed(
    {
      category: parsed.data.category,
      layoutFamily: parsed.data.layoutFamily,
      topic: parsed.data.topic,
    },
    `single-${Date.now()}`,
  );
  try {
    const { entry, svg } = await generateOne(seed, 0);
    res.json({ entry, svg });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post("/api/batch", async (req, res) => {
  const parsed = BatchJobRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (batchState.running) {
    res.status(409).json({ error: "Batch already running", batchState });
    return;
  }
  const resolved = resolveBatchJob(parsed.data);
  const collection = resolveBatchCollection(parsed.data);
  if (collection === "assessment") {
    res.status(403).json({
      error:
        "Assessment collection regeneration is disabled via API. Use CLI `npm run batch` with staging and promotion safeguards.",
    });
    return;
  }
  batchState = {
    running: true,
    progress: 0,
    total: resolved.total,
    collection,
    batchRunId: undefined,
    lastError: undefined,
  };
  res.json({
    started: true,
    count: resolved.total,
    segments: resolved.segments,
    collection,
  });

  void (async () => {
    try {
      const manifest = await runBatch(parsed.data, (done, total, detail) => {
        batchState.progress = done;
        batchState.total = total;
        if (detail) {
          batchState.currentDesignId = detail.designId;
          batchState.currentContentMode = detail.contentMode;
          batchState.currentStage = detail.stage;
          batchState.lastFallbackReason = detail.fallbackReason;
        }
      });
      batchState.batchRunId = manifest.batchRunId;
    } catch (e) {
      batchState.lastError = e instanceof Error ? e.message : String(e);
    } finally {
      batchState.running = false;
    }
  })();
});

app.get("/api/batch/status", (_req, res) => {
  res.json(batchState);
});

app.get("/api/assessment/overview", async (_req, res) => {
  try {
    const trace = await buildAssessmentTraceability();
    const reqSummary = {
      total: trace.requirements.length,
      verified: trace.requirements.filter((r) => r.status === "verified").length,
      partial: trace.requirements.filter((r) => r.status === "partial").length,
      demonstrated: trace.requirements.filter((r) => r.status === "demonstrated").length,
      failed: trace.requirements.filter((r) => r.status === "failed").length,
      not_verified: trace.requirements.filter((r) => r.status === "not_verified").length,
    };
    res.json({
      title: "VectorForge Assessment Studio",
      summary:
        "AI-assisted SVG banner and infographic engine for the Shri Genesis Gen AI Creative Developer assessment.",
      canonicalManifestPath: trace.canonicalManifestPath,
      designCount: trace.reconciliation.coverage.totalEntries,
      structuralValidation: trace.reconciliation.structuralValidation,
      provenance: trace.reconciliation.provenance,
      provenanceResolved: trace.reconciliation.provenance.unknown === 0,
      coverage: trace.reconciliation.coverage,
      executionRun: trace.reconciliation.executionRun,
      executionRunInterpretation: trace.reconciliation.executionRunInterpretation,
      blockers: trace.blockers,
      requirementsSummary: reqSummary,
      pdfAvailable: trace.pdfAvailable,
      generatedAt: trace.generatedAt,
      duplicateHeadlineGroups: trace.reconciliation.duplicateHeadlineGroups,
      nearDuplicatePairs: trace.reconciliation.nearDuplicatePairs,
      orphanSvgCount: trace.reconciliation.orphanSvgCount,
      missingSvg: trace.reconciliation.provenance.missingSvg,
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get("/api/assessment/traceability", async (_req, res) => {
  try {
    const trace = await buildAssessmentTraceability();
    res.json(trace);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get("/api/assessment/reports", async (_req, res) => {
  const names = [
    "assessment-traceability.json",
    "assessment-traceability.md",
    "assessment-reconciliation.json",
    "technical-report.md",
    "execution-report.json",
    "execution-report.md",
    "execution-run.json",
    "category-coverage.json",
    "validation-summary.json",
    "visual-qa-report.md",
    "ai-verify-batch.json",
  ];
  const reports: { name: string; path: string; exists: boolean }[] = [];
  for (const name of names) {
    const p = path.join(REPORTS_DIR, name);
    try {
      await fs.access(p);
      reports.push({ name, path: `reports/${name}`, exists: true });
    } catch {
      reports.push({ name, path: `reports/${name}`, exists: false });
    }
  }
  res.json({ reports });
});

app.get("/api/runs/history", async (_req, res) => {
  const ids = await listTargetedRunIds();
  const runs = [];
  for (const id of ids) {
    const manifest = await readTargetedManifest(id);
    if (!manifest) continue;
    const ai = manifest.entries?.filter((e) => e.contentMode === "ai").length ?? 0;
    const fb = manifest.entries?.filter((e) => e.contentMode === "fallback").length ?? 0;
    runs.push({
      runId: id,
      collection: "targeted",
      requested: manifest.requested,
      generated: manifest.generated,
      validationPassed: manifest.validationPassed,
      validationFailed: manifest.validationFailed,
      aiGenerated: ai,
      fallbackGenerated: fb,
      startedAt: manifest.startedAt,
      completedAt: manifest.completedAt,
      totalDurationMs: manifest.totalDurationMs,
      manifestPath: `outputs/runs/${id}/manifest.json`,
    });
  }
  const execRun = (await reconcileStaleExecutionRun()) ?? (await readExecutionRun());
  res.json({ targetedRuns: runs, executionRun: execRun });
});

const port = Number(process.env.API_PORT ?? 3001);
if (process.env.VITEST !== "true") {
  app.listen(port, () => {
    console.log(`VectorForge API listening on http://localhost:${port}`);
  });
}

export { app };
