import { useCallback, useEffect, useState } from "react";
import {
  fetchAssessmentOverview,
  fetchBatchStatus,
  fetchDesigns,
  fetchManifest,
  fetchMeta,
  fetchReportIndex,
  fetchRunHistory,
  fetchTraceability,
  startBatch,
} from "../api/client";
import type {
  AiStatus,
  AssessmentOverviewData,
  BatchJobRequest,
  BatchStatus,
  DesignEntry,
  Manifest,
  ReportIndexItem,
  RunHistoryResponse,
  TraceabilityRequirement,
} from "../types";

function summarizeModes(entries: DesignEntry[]) {
  const ai = entries.filter((e) => e.contentMode === "ai").length;
  const fallback = entries.filter((e) => e.contentMode === "fallback").length;
  const unknown = entries.filter((e) => e.contentMode === "unknown").length;
  const provenanceResolved = entries.length > 0 && unknown === 0;
  return { ai, fallback, unknown, provenanceResolved };
}

export function useStudioData() {
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [metaCategories, setMetaCategories] = useState<string[]>([]);
  const [metaLayoutFamilies, setMetaLayoutFamilies] = useState<string[]>([]);
  const [assessmentEntries, setAssessmentEntries] = useState<DesignEntry[]>([]);
  const [assessmentManifest, setAssessmentManifest] = useState<Manifest | null>(null);
  const [targetedEntries, setTargetedEntries] = useState<DesignEntry[]>([]);
  const [targetedManifest, setTargetedManifest] = useState<Manifest | null>(null);
  const [batch, setBatch] = useState<BatchStatus>({ running: false, progress: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [overview, setOverview] = useState<AssessmentOverviewData | null>(null);
  const [requirements, setRequirements] = useState<TraceabilityRequirement[]>([]);
  const [runHistory, setRunHistory] = useState<RunHistoryResponse | null>(null);
  const [reportIndex, setReportIndex] = useState<ReportIndexItem[]>([]);

  const refreshTargeted = useCallback(async (runId?: string) => {
    const id = runId ?? batch.batchRunId;
    const [entries, man] = await Promise.all([
      fetchDesigns("targeted", id),
      fetchManifest("targeted", id),
    ]);
    setTargetedEntries(entries);
    setTargetedManifest(man);
  }, [batch.batchRunId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [meta, aEntries, aMan, status, ov, trace, hist, reps] = await Promise.all([
        fetchMeta(),
        fetchDesigns("assessment"),
        fetchManifest("assessment"),
        fetchBatchStatus(),
        fetchAssessmentOverview(),
        fetchTraceability(),
        fetchRunHistory(),
        fetchReportIndex(),
      ]);
      setOverview(ov);
      setRequirements(trace.requirements);
      setRunHistory(hist);
      setReportIndex(reps.reports);
      setAi(meta.ai);
      setMetaCategories(meta.categories);
      setMetaLayoutFamilies(meta.layoutFamilies);
      setAssessmentEntries(aEntries);
      setAssessmentManifest(aMan);
      setBatch(status);
      if (status.batchRunId) {
        await refreshTargeted(status.batchRunId);
      } else {
        await refreshTargeted();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load studio data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshTargeted]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!batch.running) return;
    const t = setInterval(async () => {
      try {
        const s = await fetchBatchStatus();
        setBatch(s);
        if (!s.running) {
          if (s.batchRunId) await refreshTargeted(s.batchRunId);
          await refresh();
        }
      } catch {
        /* keep polling */
      }
    }, 1500);
    return () => clearInterval(t);
  }, [batch.running, refresh, refreshTargeted]);

  const runBatch = useCallback(async (request: BatchJobRequest) => {
    setBatchError(null);
    try {
      const started = await startBatch(request);
      setBatch({
        running: true,
        progress: 0,
        total: started.count,
        collection: started.collection as BatchStatus["collection"],
      });
    } catch (e) {
      setBatchError(e instanceof Error ? e.message : "Batch could not start");
    }
  }, []);

  const assessmentModes = summarizeModes(assessmentEntries);
  const targetedModes = summarizeModes(targetedEntries);

  return {
    overview,
    requirements,
    runHistory,
    reportIndex,
    ai,
    metaCategories,
    metaLayoutFamilies,
    assessmentEntries,
    assessmentManifest,
    targetedEntries,
    targetedManifest,
    batch,
    loading,
    refreshing,
    error,
    batchError,
    refresh,
    runBatch,
    assessmentModes,
    targetedModes,
  };
}
