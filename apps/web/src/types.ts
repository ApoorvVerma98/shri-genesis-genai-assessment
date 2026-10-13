export interface AiStatus {
  provider: string;
  configured: boolean;
  model?: string;
  message: string;
  reachable?: boolean;
}

export interface DesignEntry {
  id: string;
  category: string;
  topic: string;
  layoutFamily: string;
  outputPath: string;
  contentMode: string;
  validationStatus: string;
  validationIssues: string[];
  aiAttempted?: boolean;
  fallbackReason?: string;
  headline?: string;
  aiProvider?: string;
  aiModel?: string;
  designType?: string;
}

export interface BatchSegment {
  category: string;
  layoutFamily: string;
  count: number;
}

export interface BatchJobRequest {
  count?: number;
  seed?: number;
  segments?: BatchSegment[];
}

export interface Manifest {
  collection?: string;
  batchRunId?: string;
  aggregateProvenanceNote?: string;
  requested: number;
  attempted?: number;
  generated: number;
  validationPassed: number;
  validationFailed: number;
  failed: number;
  aiGenerated?: number;
  fallbackGenerated?: number;
  aiAttempted?: number;
  aiFailedThenFallback?: number;
  batchConfig?: {
    seed?: number;
    segments?: BatchSegment[];
  };
  entries?: DesignEntry[];
}

export interface BatchStatus {
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
}

export interface AssessmentOverviewData {
  title: string;
  summary: string;
  canonicalManifestPath: string;
  designCount: number;
  structuralValidation: { passed: number; failed: number };
  provenance: { ai: number; fallback: number; unknown: number; hybrid: number; failed: number; missingSvg: number };
  provenanceResolved: boolean;
  coverage: { categories: unknown[]; layouts: unknown[]; totalEntries: number };
  executionRunInterpretation: string;
  blockers: string[];
  requirementsSummary: Record<string, number>;
  pdfAvailable: boolean;
  generatedAt: string;
  duplicateHeadlineGroups?: number;
  nearDuplicatePairs?: number;
  orphanSvgCount?: number;
  missingSvg?: number;
}

export interface TraceabilityRequirement {
  id: string;
  area: string;
  title: string;
  meaning: string;
  status: string;
  verification: string;
  implementation: string[];
  evidence: string[];
  remainingWork: string;
}

export interface TraceabilityPayload {
  requirements: TraceabilityRequirement[];
}

export interface ReportIndexItem {
  name: string;
  path: string;
  exists: boolean;
}

export interface RunHistoryResponse {
  targetedRuns: {
    runId: string;
    requested: number;
    generated: number;
    validationPassed: number;
    validationFailed: number;
    aiGenerated: number;
    fallbackGenerated: number;
    startedAt: string;
    completedAt: string;
    totalDurationMs: number;
    manifestPath: string;
  }[];
  executionRun: {
    status: string;
    runId: string;
    startedAt: string;
    error?: string;
  } | null;
}

export interface MetaResponse {
  categories: string[];
  layoutFamilies: string[];
  ai: AiStatus;
}

export type AppView = "generate" | "library" | "quality";

export type BatchMode = "simple" | "targeted";
