import type {
  AssessmentOverviewData,
  BatchJobRequest,
  BatchStatus,
  DesignEntry,
  Manifest,
  MetaResponse,
  ReportIndexItem,
  RunHistoryResponse,
  TraceabilityPayload,
} from "../types";

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export async function fetchMeta(): Promise<MetaResponse> {
  return parseJson(await fetch("/api/meta"));
}

export type ManifestCollection = "assessment" | "targeted";

export async function fetchDesigns(
  collection: ManifestCollection = "assessment",
  runId?: string,
): Promise<DesignEntry[]> {
  const q = new URLSearchParams({ collection });
  if (runId) q.set("runId", runId);
  const res = await fetch(`/api/designs?${q}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchManifest(
  collection: ManifestCollection = "assessment",
  runId?: string,
): Promise<Manifest | null> {
  const q = new URLSearchParams({ collection });
  if (runId) q.set("runId", runId);
  const res = await fetch(`/api/manifest?${q}`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchBatchStatus(): Promise<BatchStatus> {
  return parseJson(await fetch("/api/batch/status"));
}

export async function startBatch(
  request: BatchJobRequest,
): Promise<{ started: boolean; count: number; collection?: string }> {
  const res = await fetch("/api/batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: unknown };
    if (body.error && typeof body.error === "object" && body.error !== null) {
      throw new Error("Invalid batch configuration. Check segment counts and categories.");
    }
    const msg =
      typeof body.error === "string"
        ? body.error
        : body.error
          ? "Invalid batch request"
          : `Batch failed (${res.status})`;
    throw new Error(msg);
  }
  return parseJson(res);
}

export function svgUrl(outputPath: string): string {
  return `/api/svg/${outputPath.replace(/^\//, "")}`;
}

export async function fetchAssessmentOverview(): Promise<AssessmentOverviewData> {
  return parseJson(await fetch("/api/assessment/overview"));
}

export async function fetchTraceability(): Promise<TraceabilityPayload> {
  const data = await parseJson<{ requirements: TraceabilityPayload["requirements"] }>(
    await fetch("/api/assessment/traceability"),
  );
  return { requirements: data.requirements };
}

export async function fetchReportIndex(): Promise<{ reports: ReportIndexItem[] }> {
  return parseJson(await fetch("/api/assessment/reports"));
}

export async function fetchRunHistory(): Promise<RunHistoryResponse> {
  return parseJson(await fetch("/api/runs/history"));
}

export async function generateSingle(body: {
  category?: string;
  topic?: string;
  layoutFamily?: string;
}): Promise<{ entry: import("../types").DesignEntry; svg: string }> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}
