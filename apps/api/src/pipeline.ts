import { createContentGenerator, generateFallbackBrief } from "@vector-forge/ai";
import {
  STYLE_PRESETS,
  buildTargetedTopicPlan,
  buildTopicPlan,
  resolveBatchJob,
  type ManifestEntry,
  type TopicSeed,
} from "@vector-forge/shared";
import { renderSvg, validateEditorialLayoutFit } from "@vector-forge/svg-engine";
import {
  detectSvgTextTruncation,
  normalizeComparisonBrief,
  validateBriefContent,
  validateComparisonSemantics,
  validatePaletteContrast,
  validateSvgStructure,
} from "@vector-forge/validation";
import fs from "node:fs/promises";
import path from "node:path";
import { getAssessmentStagingDir } from "./assessment-staging.js";
import { resolveManifestWritePath } from "./manifest-paths.js";
import { getLegacyManifestPath, resolveOutputDir, safeOutputPath } from "./paths.js";
import { resolveBatchCollection, type BatchJobRequest } from "@vector-forge/shared";

export interface GenerateOneResult {
  entry: ManifestEntry;
  svg: string;
}

export function getAiBatchDelayMs(env: NodeJS.ProcessEnv = process.env): number {
  const ms = Number(env.AI_BATCH_DELAY_MS ?? 0);
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

export async function aiBatchThrottle(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const ms = getAiBatchDelayMs(env);
  if (ms > 0) {
    await new Promise((r) => setTimeout(r, ms));
  }
}

export interface GenerateOneOptions {
  /** When set, SVG is written under this root (used for assessment staging). */
  outputRoot?: string;
}

export async function generateOne(
  seed: TopicSeed,
  styleIndex = 0,
  options?: GenerateOneOptions,
): Promise<GenerateOneResult> {
  const start = Date.now();
  const generator = createContentGenerator();
  const style = STYLE_PRESETS[styleIndex % STYLE_PRESETS.length];
  let error: string | undefined;

  const result = await generator.generate(seed, seed.id).catch((e) => {
    error = e instanceof Error ? e.message : String(e);
    throw e;
  });

  let brief = result.brief;
  brief.paletteId = style.paletteId;
  brief = normalizeComparisonBrief(brief);
  const comparisonSemanticIssues = validateComparisonSemantics(brief);
  if (comparisonSemanticIssues.length > 0 && brief.layoutFamily === "comparison") {
    const fb = generateFallbackBrief(seed);
    if (fb.partial.comparison) {
      brief = normalizeComparisonBrief({
        ...brief,
        comparison: fb.partial.comparison,
      });
    }
  }

  const contentIssues = validateBriefContent(brief);
  const editorialLayoutIssues = validateEditorialLayoutFit(brief);
  const contrastIssues = validatePaletteContrast(style.paletteId);
  const svg = renderSvg(brief, { styleId: style.id, paletteId: style.paletteId });
  const validation = validateSvgStructure(svg);
  const visualIssues = detectSvgTextTruncation(svg);
  const allIssues = [
    ...contentIssues,
    ...editorialLayoutIssues,
    ...contrastIssues,
    ...validation.issues,
    ...visualIssues,
  ];

  const outputRoot = options?.outputRoot ?? resolveOutputDir();
  const filename = `${seed.id}.svg`;
  const outputPath = safeOutputPath(seed.category, filename, outputRoot);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, svg, "utf8");

  const relPath = path.relative(outputRoot, outputPath).replace(/\\/g, "/");

  const entry: ManifestEntry = {
    id: seed.id,
    category: seed.category,
    topic: seed.topic,
    designType: seed.designType,
    layoutFamily: seed.layoutFamily,
    paletteId: style.paletteId,
    styleId: style.id,
    outputPath: relPath,
    contentMode: result.mode,
    aiProvider: result.aiProvider,
    aiModel: result.aiModel,
    aiAttempted: result.aiAttempted,
    fallbackReason: result.fallbackReason,
    headline: brief.headline,
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    validationStatus: allIssues.length ? "failed" : "passed",
    validationIssues: allIssues,
    contentHash: validation.contentHash,
    structureHash: validation.structureHash,
    error,
  };

  return { entry, svg };
}

export function buildPlanFromRequest(request: BatchJobRequest, batchRunId: string): TopicSeed[] {
  const resolved = resolveBatchJob(request);
  if (resolved.segments) {
    return buildTargetedTopicPlan(resolved.segments, resolved.seed, batchRunId);
  }
  return buildTopicPlan(resolved.total, resolved.seed);
}

export type BatchProgressDetail = {
  designId: string;
  contentMode: string;
  stage: "complete" | "failed";
  fallbackReason?: string;
};

export type BatchProgressCallback = (
  done: number,
  total: number,
  detail?: BatchProgressDetail,
) => void;

export interface RunBatchOptions {
  /** CLI execution run id — assessment batches stage under outputs/staging/<id>/ */
  assessmentStagingRunId?: string;
}

export async function runBatch(
  request: BatchJobRequest | number,
  seedOrOnProgress?: number | BatchProgressCallback,
  onProgressLegacy?: BatchProgressCallback,
  runOptions?: RunBatchOptions,
) {
  const batchRequest: BatchJobRequest =
    typeof request === "number" ? { count: request, seed: seedOrOnProgress as number } : request;

  const onProgress =
    typeof seedOrOnProgress === "function" ? seedOrOnProgress : onProgressLegacy;

  const resolved = resolveBatchJob(batchRequest);
  const batchRunId = Date.now().toString(36);
  const plan = buildPlanFromRequest(batchRequest, batchRunId);

  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const entries: ManifestEntry[] = [];
  let generated = 0;
  let validationPassed = 0;
  let validationFailed = 0;
  let failed = 0;

  const aiConfigured =
    (process.env.AI_PROVIDER === "openai-compatible" && !!process.env.AI_API_KEY?.trim()) ||
    process.env.AI_PROVIDER === "ollama";

  const collection = resolveBatchCollection(batchRequest);
  const assessmentStagingId =
    collection === "assessment"
      ? (runOptions?.assessmentStagingRunId ?? batchRunId)
      : undefined;
  const writeRoot = assessmentStagingId
    ? getAssessmentStagingDir(assessmentStagingId)
    : resolveOutputDir();

  for (let i = 0; i < plan.length; i++) {
    const topicSeed = plan[i];
    try {
      if (aiConfigured && i > 0) await aiBatchThrottle();
      const { entry } = await generateOne(topicSeed, i, {
        outputRoot: assessmentStagingId ? writeRoot : undefined,
      });
      entries.push(entry);
      generated++;
      if (entry.validationStatus === "passed") validationPassed++;
      else validationFailed++;
    } catch (e) {
      failed++;
      entries.push({
        id: topicSeed.id,
        category: topicSeed.category,
        topic: topicSeed.topic,
        designType: topicSeed.designType,
        layoutFamily: topicSeed.layoutFamily,
        paletteId: "unknown",
        styleId: "unknown",
        outputPath: "",
        contentMode: "fallback",
        aiAttempted: false,
        generatedAt: new Date().toISOString(),
        durationMs: 0,
        validationStatus: "failed",
        validationIssues: [],
        error: e instanceof Error ? e.message : String(e),
      });
    }
    const last = entries[entries.length - 1];
    onProgress?.(i + 1, plan.length, {
      designId: last?.id ?? topicSeed.id,
      contentMode: last?.contentMode ?? "fallback",
      stage: last?.validationStatus === "failed" ? "failed" : "complete",
      fallbackReason: last?.fallbackReason,
    });
  }

  const aiGenerated = entries.filter((e) => e.contentMode === "ai").length;
  const fallbackGenerated = entries.filter((e) => e.contentMode === "fallback").length;
  const aiAttempted = entries.filter((e) => e.aiAttempted).length;
  const aiFailedThenFallback = entries.filter(
    (e) => e.aiAttempted && e.contentMode === "fallback",
  ).length;

  const manifest = {
    collection,
    batchRunId: collection === "targeted" ? batchRunId : undefined,
    requested: resolved.total,
    attempted: plan.length,
    generated,
    validationPassed,
    validationFailed,
    failed,
    aiGenerated,
    fallbackGenerated,
    aiAttempted,
    aiFailedThenFallback,
    batchConfig: {
      seed: resolved.seed,
      segments: resolved.segments,
    },
    startedAt,
    completedAt: new Date().toISOString(),
    totalDurationMs: Date.now() - t0,
    entries,
  };

  const serialized = JSON.stringify(manifest, null, 2);
  if (collection === "assessment" && assessmentStagingId) {
    await fs.mkdir(writeRoot, { recursive: true });
    await fs.writeFile(path.join(writeRoot, "manifest.json"), serialized, "utf8");
  } else {
    const manifestPath = resolveManifestWritePath(collection, batchRunId);
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(manifestPath, serialized, "utf8");
    if (collection === "assessment") {
      await fs.mkdir(resolveOutputDir(), { recursive: true });
      await fs.writeFile(getLegacyManifestPath(), serialized, "utf8");
    }
  }
  return { ...manifest, assessmentStagingRunId: assessmentStagingId };
}
