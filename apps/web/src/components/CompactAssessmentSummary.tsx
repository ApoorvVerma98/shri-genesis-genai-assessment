import type { AssessmentOverviewData } from "../types";

interface CompactAssessmentSummaryProps {
  overview: AssessmentOverviewData | null;
  loading?: boolean;
}

export function CompactAssessmentSummary({ overview, loading }: CompactAssessmentSummaryProps) {
  if (loading && !overview) {
    return <p className="card-meta">Loading assessment summary…</p>;
  }
  if (!overview) return null;

  const ready =
    overview.blockers.length === 0 &&
    overview.provenanceResolved &&
    overview.structuralValidation.failed === 0;

  return (
    <section className="assessment-strip" aria-label="Canonical collection summary">
      <div className="assessment-strip__grid">
        <div>
          <span className="assessment-strip__label">Collection</span>
          <strong>{overview.designCount}</strong> designs
        </div>
        <div>
          <span className="assessment-strip__label">Validation</span>
          <strong>{overview.structuralValidation.passed}</strong> passed
          {overview.structuralValidation.failed > 0 && (
            <span className="text-warn"> · {overview.structuralValidation.failed} failed</span>
          )}
        </div>
        <div>
          <span className="assessment-strip__label">Provenance</span>
          AI <strong>{overview.provenance.ai}</strong> · fallback{" "}
          <strong>{overview.provenance.fallback}</strong> · unknown{" "}
          <strong>{overview.provenance.unknown}</strong>
        </div>
        <div>
          <span className="assessment-strip__label">Assessment-ready</span>
          <strong className={ready ? "text-ok" : "text-warn"}>{ready ? "Yes" : "Not yet"}</strong>
        </div>
      </div>
      {overview.blockers.length > 0 && (
        <ul className="assessment-strip__blockers">
          {overview.blockers.slice(0, 3).map((b) => (
            <li key={b}>{b}</li>
          ))}
          {overview.blockers.length > 3 && (
            <li>+{overview.blockers.length - 3} more — see Assessment &amp; Quality</li>
          )}
        </ul>
      )}
    </section>
  );
}
