import { useState } from "react";
import type {
  AssessmentOverviewData,
  DesignEntry,
  Manifest,
  ReportIndexItem,
  RunHistoryResponse,
  TraceabilityRequirement,
} from "../types";
import { QualityOverview } from "./QualityOverview";
import { RequirementsEvidence } from "./RequirementsEvidence";
import { RunsReports } from "./RunsReports";

type Tab = "matrix" | "validation" | "runs";

interface AssessmentQualityProps {
  overview: AssessmentOverviewData | null;
  requirements: TraceabilityRequirement[];
  loading: boolean;
  assessmentManifest: Manifest | null;
  assessmentEntries: DesignEntry[];
  targetedManifest: Manifest | null;
  targetedEntries: DesignEntry[];
  assessmentModes: { ai: number; fallback: number; unknown: number; provenanceResolved?: boolean };
  targetedModes: { ai: number; fallback: number; unknown: number };
  runHistory: RunHistoryResponse | null;
  reportIndex: ReportIndexItem[];
}

export function AssessmentQuality(props: AssessmentQualityProps) {
  const [tab, setTab] = useState<Tab>("matrix");

  const tabs: { id: Tab; label: string }[] = [
    { id: "matrix", label: "Requirements & evidence" },
    { id: "validation", label: "Validation & QA" },
    { id: "runs", label: "Runs & reports" },
  ];

  const blockers = props.overview?.blockers ?? [];
  const unknownCount = props.assessmentModes.unknown;

  return (
    <div className="assessment-quality">
      <section className="quality-intro" aria-labelledby="quality-intro-title">
        <h2 id="quality-intro-title" className="quality-intro__title">What this page answers</h2>
        <ol className="quality-intro__list">
          <li>
            <strong>What did the assessment ask for?</strong> — PDF requirements mapped in the
            traceability matrix (tab below).
          </li>
          <li>
            <strong>What was actually delivered?</strong> — Canonical manifest counts, provenance,
            and validation status from live API data (not invented metrics).
          </li>
          <li>
            <strong>What still blocks submission?</strong> — Blockers, unknown provenance, failed
            validation, and stale or interrupted runs are shown explicitly.
          </li>
        </ol>
      </section>

      {props.overview && (
        <section
          className={`readiness-card ${blockers.length > 0 || unknownCount > 0 ? "readiness-card--warn" : ""}`}
          aria-labelledby="readiness-title"
        >
          <h2 id="readiness-title" className="readiness-card__title">Assessment readiness</h2>
          <p className="readiness-card__summary">{props.overview.summary}</p>
          <dl className="readiness-card__grid">
            <div>
              <dt>PDF specification</dt>
              <dd>{props.overview.pdfAvailable ? "Present in docs/" : "Missing from repository"}</dd>
            </div>
            <div>
              <dt>Design count</dt>
              <dd>{props.overview.designCount}</dd>
            </div>
            <div>
              <dt>Structural validation</dt>
              <dd>
                {props.overview.structuralValidation.passed} passed
                {props.overview.structuralValidation.failed > 0 && (
                  <span className="text-warn"> · {props.overview.structuralValidation.failed} failed</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Provenance (canonical)</dt>
              <dd>
                AI {props.overview.provenance.ai} · fallback {props.overview.provenance.fallback} ·
                unknown <strong>{props.overview.provenance.unknown}</strong>
              </dd>
            </div>
            <div className="readiness-card__wide">
              <dt>Latest execution interpretation</dt>
              <dd>{props.overview.executionRunInterpretation}</dd>
            </div>
          </dl>
          {blockers.length > 0 && (
            <div className="alert alert--error" role="alert">
              <strong>Blockers</strong>
              <ul className="issue-list">
                {blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          {blockers.length === 0 && unknownCount > 0 && (
            <div className="alert alert--info" role="note">
              {unknownCount} design(s) still have unknown per-entry provenance — aggregate batch
              metrics do not assign AI vs fallback to individual IDs.
            </div>
          )}
        </section>
      )}

      <div className="tab-bar" role="tablist" aria-label="Assessment sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab-bar__btn ${tab === t.id ? "tab-bar__btn--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "matrix" && (
        <RequirementsEvidence requirements={props.requirements} loading={props.loading} />
      )}
      {tab === "validation" && (
        <QualityOverview
          assessmentManifest={props.assessmentManifest}
          assessmentEntries={props.assessmentEntries}
          targetedManifest={props.targetedManifest}
          targetedEntries={props.targetedEntries}
          assessmentModes={props.assessmentModes}
          targetedModes={props.targetedModes}
          overview={props.overview}
        />
      )}
      {tab === "runs" && (
        <RunsReports history={props.runHistory} reports={props.reportIndex} loading={props.loading} />
      )}
    </div>
  );
}
