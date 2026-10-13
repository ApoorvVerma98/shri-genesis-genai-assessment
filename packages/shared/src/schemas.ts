import { z } from "zod";

export const LayoutFamilySchema = z.enum([
  "promotional-banner",
  "editorial-infographic",
  "metrics-dashboard",
  "step-by-step",
  "comparison",
  "feature-grid",
  "quote-banner",
  "list-announcement",
]);

export type LayoutFamily = z.infer<typeof LayoutFamilySchema>;

export const DesignTypeSchema = z.enum([
  "banner",
  "infographic",
  "social",
  "announcement",
  "education",
]);

export const CategorySchema = z.enum([
  "technology",
  "business",
  "education",
  "healthcare",
  "finance",
  "marketing",
  "cybersecurity",
  "sustainability",
  "ecommerce",
  "productivity",
  "social-awareness",
  "real-estate",
]);

export type Category = z.infer<typeof CategorySchema>;

export const MetricItemSchema = z.object({
  label: z.string().max(80),
  value: z.string().max(24),
  note: z.string().max(120).optional(),
  illustrative: z.boolean().optional(),
});

export const StepItemSchema = z.object({
  title: z.string().max(80),
  description: z.string().max(200),
});

export const ComparisonItemSchema = z.object({
  name: z.string().max(60),
  points: z.array(z.string().max(120)).min(1).max(5),
});

export const GenerationBriefSchema = z.object({
  id: z.string().min(1).max(64),
  category: CategorySchema,
  topic: z.string().min(3).max(120),
  designType: DesignTypeSchema,
  tone: z.string().max(60).default("professional"),
  targetAudience: z.string().max(120).optional(),
  styleDirection: z.string().max(120).optional(),
  paletteId: z.string().max(40).optional(),
  layoutFamily: LayoutFamilySchema,
  canvas: z.object({
    width: z.number().int().min(400).max(2400).default(1200),
    height: z.number().int().min(300).max(2400).default(630),
  }),
  headline: z.string().min(3).max(120),
  subtitle: z.string().max(160).optional(),
  supportingText: z.string().max(400).optional(),
  keyPoints: z.array(z.string().max(140)).max(8).optional(),
  steps: z.array(StepItemSchema).max(6).optional(),
  comparison: z
    .object({
      leftTitle: z.string().max(60),
      rightTitle: z.string().max(60),
      items: z.array(ComparisonItemSchema).min(2).max(2),
    })
    .optional(),
  metrics: z.array(MetricItemSchema).max(6).optional(),
  quote: z
    .object({
      text: z.string().max(280),
      attribution: z.string().max(80).optional(),
    })
    .optional(),
  visualMotifs: z.array(z.string().max(60)).max(6).optional(),
  layoutRecommendation: z.string().max(200).optional(),
});

export type GenerationBrief = z.infer<typeof GenerationBriefSchema>;

export const ContentGenerationModeSchema = z.enum([
  "ai",
  "fallback",
  "hybrid",
  /** Recorded when file/metadata exists but AI vs fallback per entry could not be verified. */
  "unknown",
]);

export const ManifestEntrySchema = z.object({
  id: z.string(),
  category: CategorySchema,
  topic: z.string(),
  designType: DesignTypeSchema,
  layoutFamily: LayoutFamilySchema,
  paletteId: z.string(),
  styleId: z.string(),
  outputPath: z.string(),
  contentMode: ContentGenerationModeSchema,
  aiProvider: z.string().optional(),
  aiModel: z.string().optional(),
  generatedAt: z.string(),
  durationMs: z.number(),
  validationStatus: z.enum(["passed", "failed", "skipped"]),
  validationIssues: z.array(z.string()),
  contentHash: z.string().optional(),
  structureHash: z.string().optional(),
  headline: z.string().optional(),
  aiAttempted: z.boolean().optional(),
  fallbackReason: z.string().optional(),
  /** Human-readable note when provenance or source file history is incomplete. */
  provenanceNote: z.string().optional(),
  error: z.string().optional(),
});

export type ManifestEntry = z.infer<typeof ManifestEntrySchema>;

export const BatchManifestSchema = z.object({
  collection: z.enum(["assessment", "targeted"]).optional(),
  batchRunId: z.string().optional(),
  /** Batch-level note when per-entry AI counts cannot be reconstructed. */
  aggregateProvenanceNote: z.string().optional(),
  requested: z.number(),
  attempted: z.number(),
  generated: z.number(),
  validationPassed: z.number(),
  validationFailed: z.number(),
  failed: z.number(),
  aiGenerated: z.number().optional(),
  fallbackGenerated: z.number().optional(),
  aiAttempted: z.number().optional(),
  aiFailedThenFallback: z.number().optional(),
  batchConfig: z
    .object({
      seed: z.number().optional(),
      segments: z
        .array(
          z.object({
            category: CategorySchema,
            layoutFamily: LayoutFamilySchema,
            count: z.number(),
          }),
        )
        .optional(),
    })
    .optional(),
  startedAt: z.string(),
  completedAt: z.string(),
  totalDurationMs: z.number(),
  entries: z.array(ManifestEntrySchema),
});

export type BatchManifest = z.infer<typeof BatchManifestSchema>;

export const SingleGenerateRequestSchema = z.object({
  category: CategorySchema.optional(),
  topic: z.string().min(3).max(120).optional(),
  layoutFamily: LayoutFamilySchema.optional(),
});
