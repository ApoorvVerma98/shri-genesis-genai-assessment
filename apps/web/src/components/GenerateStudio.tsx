import { useCallback, useState } from "react";
import type {
  AssessmentOverviewData,
  BatchJobRequest,
  BatchSegment,
  BatchStatus,
  DesignEntry,
} from "../types";
import { generateSingle, svgUrl } from "../api/client";
import { categoryLabel, layoutLabel } from "../lib/layoutLabels";
import { CompactAssessmentSummary } from "./CompactAssessmentSummary";
import { DesignDetailModal } from "./DesignDetailModal";
import { DesignMetaPanel } from "./DesignMetaPanel";
import { SvgPreview } from "./SvgPreview";

interface GenerateStudioProps {
  batch: BatchStatus;
  batchError: string | null;
  categories: string[];
  layoutFamilies: string[];
  onRunBatch: (request: BatchJobRequest) => void;
  disabled: boolean;
  overview: AssessmentOverviewData | null;
  loadingOverview: boolean;
}

const defaultSegment = (categories: string[], layouts: string[]): BatchSegment => ({
  category: categories[0] ?? "technology",
  layoutFamily: layouts[0] ?? "promotional-banner",
  count: 1,
});

const STEPS = [
  "Brief",
  "Category & layout",
  "Generate",
  "Preview",
  "Download",
];

export function GenerateStudio({
  batch,
  batchError,
  categories,
  layoutFamilies,
  onRunBatch,
  disabled,
  overview,
  loadingOverview,
}: GenerateStudioProps) {
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "technology");
  const [layoutFamily, setLayoutFamily] = useState(layoutFamilies[0] ?? "promotional-banner");
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ entry: DesignEntry; svg: string } | null>(null);
  const [inspectOpen, setInspectOpen] = useState(false);

  const [totalCount, setTotalCount] = useState(100);
  const [segments, setSegments] = useState<BatchSegment[]>(() => [
    defaultSegment(categories, layoutFamilies),
  ]);
  const [localError, setLocalError] = useState<string | null>(null);

  const runSingle = useCallback(async () => {
    setSingleError(null);
    setSingleLoading(true);
    setLastResult(null);
    try {
      const res = await generateSingle({
        category,
        layoutFamily,
        topic: topic.trim() || undefined,
      });
      setLastResult(res);
    } catch (e) {
      setSingleError(e instanceof Error ? e.message : String(e));
    } finally {
      setSingleLoading(false);
    }
  }, [category, layoutFamily, topic]);

  function runTargetedBatch() {
    setLocalError(null);
    const total = segments.reduce((s, x) => s + (Number(x.count) || 0), 0);
    if (total < 1 || total > 200) {
      setLocalError("Segment total must be between 1 and 200.");
      return;
    }
    onRunBatch({ segments });
  }

  function runAssessmentBatch() {
    setLocalError(null);
    if (totalCount < 1 || totalCount > 200) {
      setLocalError("Total must be between 1 and 200.");
      return;
    }
    const ok = window.confirm(
      `Regenerate the canonical assessment collection (${totalCount} designs)? ` +
        "This updates outputs/assessment/manifest.json. A backup should be taken first (pre-regen-backup).",
    );
    if (!ok) return;
    onRunBatch({ count: totalCount });
  }

  const entry = lastResult?.entry;
  const stepIndex = singleLoading ? 2 : entry ? 4 : topic.trim() ? 1 : 0;
  const validationFailed = entry && entry.validationStatus !== "passed";
  const isFallback = entry?.contentMode === "fallback";

  return (
    <div className="generate-studio">
      <CompactAssessmentSummary overview={overview} loading={loadingOverview} />

      <ol className="workflow-steps" aria-label="Generation workflow">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`workflow-steps__item ${i <= stepIndex ? "workflow-steps__item--active" : ""} ${i === stepIndex ? "workflow-steps__item--current" : ""}`}
          >
            <span className="workflow-steps__num" aria-hidden>{i + 1}</span>
            <span>{label}</span>
          </li>
        ))}
      </ol>

      <div className="generate-studio__grid">
        <section className="studio-panel" aria-labelledby="studio-form-title">
          <h2 id="studio-form-title" className="studio-panel__title">Create a design</h2>
          <p className="studio-panel__lead">
            Topic → structured AI brief (or documented fallback) → SVG renderer → validation. Outputs a
            one-off file under <code>outputs/</code> — not the canonical assessment manifest.
          </p>

          <label className="field">
            <span className="field__label">Topic or brief</span>
            <textarea
              className="input input--textarea"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Phishing-resistant authentication for remote teams"
              rows={3}
              disabled={singleLoading || batch.running}
            />
            <span className="field__hint">Optional — the API can infer from category when empty.</span>
          </label>

          <div className="field-row">
            <label className="field field--grow">
              <span className="field__label">Category</span>
              <select
                className="select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={singleLoading || batch.running}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{categoryLabel(c)}</option>
                ))}
              </select>
            </label>
            <label className="field field--grow">
              <span className="field__label">Layout</span>
              <select
                className="select"
                value={layoutFamily}
                onChange={(e) => setLayoutFamily(e.target.value)}
                disabled={singleLoading || batch.running}
              >
                {layoutFamilies.map((l) => (
                  <option key={l} value={l}>{layoutLabel(l)}</option>
                ))}
              </select>
              <span className="field__hint field__hint--code">{layoutFamily}</span>
            </label>
          </div>

          <div className="studio-panel__actions">
            <button
              type="button"
              className="btn btn--primary btn--lg"
              onClick={() => void runSingle()}
              disabled={singleLoading || batch.running}
              aria-busy={singleLoading}
            >
              {singleLoading ? "Generating…" : "Generate design"}
            </button>
            {singleError && (
              <button type="button" className="btn" onClick={() => void runSingle()} disabled={singleLoading}>
                Retry
              </button>
            )}
          </div>

          {singleError && (
            <div className="alert alert--error" role="alert">
              <strong>Generation failed.</strong> {singleError}
            </div>
          )}
        </section>

        <section className="studio-panel studio-panel--preview" aria-labelledby="studio-preview-title">
          <h2 id="studio-preview-title" className="studio-panel__title">Result</h2>

          {singleLoading && (
            <div className="state-block state-block--loading" role="status">
              <div className="spinner" aria-hidden />
              <p>Generating SVG…</p>
              <p className="card-meta">Calling the API with your category and layout selection.</p>
            </div>
          )}

          {!singleLoading && !entry && !singleError && (
            <div className="state-block">
              <p>Your artwork will appear here after generation.</p>
              <p className="card-meta">Use Inspect for a full-screen preview with metadata.</p>
            </div>
          )}

          {!singleLoading && entry && (
            <>
              {isFallback && (
                <div className="alert alert--info" role="status">
                  Content used the <strong>fallback</strong> path — see fallback reason in metadata.
                </div>
              )}
              {validationFailed && (
                <div className="alert alert--error" role="alert">
                  Validation reported <strong>{entry.validationStatus}</strong>. Review issues before
                  treating this as submission-ready.
                </div>
              )}
              {!validationFailed && entry.validationStatus === "passed" && (
                <div className="alert alert--success" role="status">
                  Structural validation passed. Visual quality still requires human review.
                </div>
              )}

              {entry.outputPath && (
                <div className="preview-stage">
                  <SvgPreview
                    outputPath={entry.outputPath}
                    title={entry.headline ?? entry.topic}
                    className="preview-frame--large"
                  />
                </div>
              )}

              <div className="preview-actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setInspectOpen(true)}
                  disabled={!entry.outputPath}
                >
                  Inspect preview
                </button>
                {entry.outputPath && (
                  <a className="btn" href={svgUrl(entry.outputPath)} download={`${entry.id}.svg`}>
                    Download SVG
                  </a>
                )}
              </div>

              <DesignMetaPanel entry={entry} compact />
            </>
          )}
        </section>
      </div>

      <section className="studio-batch-zone" aria-labelledby="batch-zone-title">
        <h2 id="batch-zone-title" className="studio-panel__title">Batch operations</h2>
        <p className="studio-panel__lead">
          Separate from single-design demos. Targeted batches write to <code>outputs/runs/</code> only.
        </p>

        <div className="studio-batch-zone__inner">
          <div className="studio-batch-zone__block">
            <h3 className="studio-batch-zone__subtitle">Targeted batch</h3>
            <div className="segment-table">
              <div className="segment-table__head" aria-hidden>
                <span>Category</span>
                <span>Layout</span>
                <span>Count</span>
                <span />
              </div>
              {segments.map((row, i) => (
                <div className="segment-table__row" key={i}>
                  <select
                    className="select"
                    value={row.category}
                    onChange={(e) =>
                      setSegments((prev) =>
                        prev.map((r, j) => (j === i ? { ...r, category: e.target.value } : r)),
                      )
                    }
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{categoryLabel(c)}</option>
                    ))}
                  </select>
                  <select
                    className="select"
                    value={row.layoutFamily}
                    onChange={(e) =>
                      setSegments((prev) =>
                        prev.map((r, j) => (j === i ? { ...r, layoutFamily: e.target.value } : r)),
                      )
                    }
                  >
                    {layoutFamilies.map((l) => (
                      <option key={l} value={l}>{layoutLabel(l)}</option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={50}
                    value={row.count}
                    aria-label="Segment count"
                    onChange={(e) =>
                      setSegments((prev) =>
                        prev.map((r, j) => (j === i ? { ...r, count: Number(e.target.value) } : r)),
                      )
                    }
                  />
                </div>
              ))}
              <button
                type="button"
                className="btn"
                onClick={() => setSegments((p) => [...p, defaultSegment(categories, layoutFamilies)])}
              >
                Add segment
              </button>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={runTargetedBatch}
              disabled={disabled || batch.running}
            >
              Run targeted batch
            </button>
          </div>

          <details className="studio-batch-zone__danger">
            <summary>Full assessment regeneration</summary>
            <p className="card-meta">
              Updates the canonical 100-design collection. Run <code>npm run pre-regen-backup</code> first.
              Requires explicit confirmation — never runs automatically.
            </p>
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
            <button
              type="button"
              className="btn btn--danger"
              onClick={runAssessmentBatch}
              disabled={disabled || batch.running}
            >
              Regenerate assessment collection
            </button>
          </details>
        </div>

        {batch.running && (
          <div className="progress progress--batch" role="status">
            {batch.total > 0
              ? `Progress: ${batch.progress} / ${batch.total}`
              : "Starting batch…"}
            {batch.currentDesignId && (
              <div className="card-meta">
                {batch.currentDesignId} — {batch.currentContentMode}
                {batch.lastFallbackReason && ` — ${batch.lastFallbackReason.slice(0, 100)}`}
              </div>
            )}
          </div>
        )}
        {(batchError || localError || batch.lastError) && (
          <div className="alert alert--error" role="alert">{localError ?? batchError ?? batch.lastError}</div>
        )}
      </section>

      {inspectOpen && entry && (
        <DesignDetailModal design={entry} onClose={() => setInspectOpen(false)} />
      )}
    </div>
  );
}
