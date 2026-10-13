import { useMemo, useState } from "react";
import type { BatchJobRequest, BatchSegment, BatchStatus } from "../types";

interface GeneratePanelProps {
  batch: BatchStatus;
  batchError: string | null;
  categories: string[];
  layoutFamilies: string[];
  onRunBatch: (request: BatchJobRequest) => void;
  disabled: boolean;
}

const defaultSegment = (categories: string[], layouts: string[]): BatchSegment => ({
  category: categories[0] ?? "technology",
  layoutFamily: layouts[0] ?? "promotional-banner",
  count: 10,
});

export function GeneratePanel({
  batch,
  batchError,
  categories,
  layoutFamilies,
  onRunBatch,
  disabled,
}: GeneratePanelProps) {
  const [mode, setMode] = useState<"simple" | "targeted">("targeted");
  const [totalCount, setTotalCount] = useState(100);
  const [segments, setSegments] = useState<BatchSegment[]>(() => [
    defaultSegment(categories, layoutFamilies),
  ]);
  const [localError, setLocalError] = useState<string | null>(null);

  const summary = useMemo(() => {
    if (mode === "simple") {
      return { total: totalCount, lines: [`${totalCount} designs (default topic mix)`] };
    }
    const total = segments.reduce((s, x) => s + (Number(x.count) || 0), 0);
    const lines = segments.map(
      (s) => `${s.count} × ${s.category} · ${s.layoutFamily.replace(/-/g, " ")}`,
    );
    return { total, lines };
  }, [mode, totalCount, segments]);

  function addSegment() {
    setSegments((prev) => [...prev, defaultSegment(categories, layoutFamilies)]);
  }

  function updateSegment(index: number, patch: Partial<BatchSegment>) {
    setSegments((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeSegment(index: number) {
    setSegments((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function handleSubmit() {
    setLocalError(null);
    if (mode === "simple") {
      if (totalCount < 1 || totalCount > 200) {
        setLocalError("Total must be between 1 and 200.");
        return;
      }
      const confirmed = window.confirm(
        `Regenerate the canonical assessment collection (${totalCount} designs)? ` +
          "This updates outputs/assessment/manifest.json. Targeted runs are kept separate.",
      );
      if (!confirmed) return;
      onRunBatch({ count: totalCount });
      return;
    }
    if (summary.total < 1 || summary.total > 200) {
      setLocalError("Segment total must be between 1 and 200.");
      return;
    }
    for (const s of segments) {
      if (s.count < 1) {
        setLocalError("Each segment needs a count of at least 1.");
        return;
      }
    }
    onRunBatch({ segments });
  }

  return (
    <div className="panel panel--wide">
      <h2 className="panel__title">Batch generation</h2>
      <p className="panel__lead">
        <strong>Lifecycle:</strong> topic plan (seed) → AI JSON brief (or explicit fallback) → rule-based
        SVG renderer → structural validation → manifest entry. Simple total updates the assessment
        collection; targeted segments write to <code>outputs/runs/&lt;id&gt;/</code> only.
      </p>
      <p className="card-meta">
        Default total of 100 is a configurable initial value for assessment regeneration, not required
        for every generation session.
      </p>
      <p className="card-meta">
        Provider configuration is not proof that every design will be AI-generated. Groq free tier
        often returns HTTP 429 (TPM rate limits) during rapid batches—use{" "}
        <code>AI_BATCH_DELAY_MS</code> in <code>.env</code> if needed.
      </p>

      <div className="mode-toggle" role="radiogroup" aria-label="Batch mode">
        <button
          type="button"
          className={`mode-toggle__btn ${mode === "simple" ? "mode-toggle__btn--active" : ""}`}
          onClick={() => setMode("simple")}
          role="radio"
          aria-checked={mode === "simple"}
        >
          Simple total
        </button>
        <button
          type="button"
          className={`mode-toggle__btn ${mode === "targeted" ? "mode-toggle__btn--active" : ""}`}
          onClick={() => setMode("targeted")}
          role="radio"
          aria-checked={mode === "targeted"}
        >
          Targeted segments
        </button>
      </div>

      {mode === "simple" && (
        <div className="alert alert--error" role="alert">
          Simple total updates the <strong>canonical assessment manifest</strong> (outputs/assessment/).
          Use targeted segments for on-demand generation that does not replace the 100-design collection.
        </div>
      )}

      {mode === "simple" ? (
        <label className="field">
          <span className="field__label">Total designs</span>
          <input
            className="input"
            type="number"
            min={1}
            max={200}
            value={totalCount}
            onChange={(e) => setTotalCount(Number(e.target.value))}
          />
        </label>
      ) : (
        <div className="segment-table">
          <div className="segment-table__head">
            <span>Category</span>
            <span>Layout family</span>
            <span>Count</span>
            <span />
          </div>
          {segments.map((row, i) => (
            <div className="segment-table__row" key={i}>
              <select
                className="select"
                value={row.category}
                onChange={(e) => updateSegment(i, { category: e.target.value })}
                aria-label={`Category row ${i + 1}`}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                className="select"
                value={row.layoutFamily}
                onChange={(e) => updateSegment(i, { layoutFamily: e.target.value })}
                aria-label={`Layout row ${i + 1}`}
              >
                {layoutFamilies.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <input
                className="input"
                type="number"
                min={1}
                max={200}
                value={row.count}
                onChange={(e) => updateSegment(i, { count: Number(e.target.value) })}
                aria-label={`Count row ${i + 1}`}
              />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => removeSegment(i)}
                disabled={segments.length <= 1}
                aria-label={`Remove row ${i + 1}`}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="btn" onClick={addSegment}>
            Add segment
          </button>
        </div>
      )}

      <div className="batch-summary" aria-live="polite">
        <strong>Requested distribution ({summary.total} designs)</strong>
        <ul>
          {summary.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="btn btn--primary"
        onClick={handleSubmit}
        disabled={disabled || batch.running}
        aria-busy={batch.running}
      >
        {batch.running ? "Generation in progress…" : `Generate ${summary.total} designs`}
      </button>

      {batch.running && (
        <div className="progress" role="status">
          {batch.total > 0
            ? `Progress: ${batch.progress} / ${batch.total} designs`
            : "Starting batch…"}
          {batch.currentDesignId && (
            <div className="card-meta">
              Last: {batch.currentDesignId} — {batch.currentContentMode} ({batch.currentStage})
              {batch.lastFallbackReason && ` — ${batch.lastFallbackReason.slice(0, 120)}`}
            </div>
          )}
        </div>
      )}
      {batch.lastError && (
        <div className="alert alert--error" role="alert">{batch.lastError}</div>
      )}
      {(batchError || localError) && (
        <div className="alert alert--error" role="alert">{localError ?? batchError}</div>
      )}
      {!batch.running && batch.progress > 0 && batch.progress >= batch.total && !batch.lastError && (
        <div className="alert alert--info" role="status">
          Last batch finished. Refresh the library to see updated counts and provenance.
        </div>
      )}
    </div>
  );
}
