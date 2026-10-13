import type { AssessmentOverviewData } from "../types";

interface AssessmentOverviewProps {
  data: AssessmentOverviewData | null;
  loading: boolean;
  onNavigate: (view: string) => void;
}

export function AssessmentOverview({ data, loading, onNavigate }: AssessmentOverviewProps) {
  if (loading) return <p className="card-meta" role="status">Loading assessment overview…</p>;
  if (!data) {
    return (
      <div className="alert alert--error" role="alert">
        Could not load assessment overview from the API.
      </div>
    );
  }

  const p = data.provenance;
  const showUnknownBanner = !data.provenanceResolved || p.unknown > 0;

  return (
    <div className="overview">
      <header className="overview__hero">
        <h2 className="overview__title">{data.title}</h2>
        <p className="overview__lead">{data.summary}</p>
        {!data.pdfAvailable && (
          <div className="alert alert--info" role="note">
            Assessment PDF not found in repository — some requirement wording is not_verified.
          </div>
        )}
      </header>

      {showUnknownBanner && (
        <div className="alert alert--error" role="alert">
          <strong>Provenance not resolved:</strong> {p.unknown} of {data.designCount} designs have
          unknown AI/fallback status. Do not display a misleading AI success percentage for the
          canonical collection.
        </div>
      )}

      {data.blockers.length > 0 && (
        <section className="panel">
          <h3 className="panel__title">Outstanding blockers</h3>
          <ul className="overview__list">
            {data.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="stats" role="region" aria-label="Assessment metrics">
        <div className="stat">
          <div className="stat__label">Canonical designs</div>
          <div className="stat__value">{data.designCount}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Struct. valid</div>
          <div className="stat__value">{data.structuralValidation.passed}</div>
        </div>
        <div className="stat">
          <div className="stat__label">AI (evidence)</div>
          <div className="stat__value">{p.ai}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Fallback</div>
          <div className="stat__value">{p.fallback}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Unknown</div>
          <div className="stat__value">{p.unknown}</div>
        </div>
        <div className="stat">
          <div className="stat__label">Req. verified</div>
          <div className="stat__value">{data.requirementsSummary.verified}</div>
        </div>
      </div>

      <section className="panel">
        <h3 className="panel__title">Latest run</h3>
        <p className="card-meta">{data.executionRunInterpretation}</p>
      </section>

      <nav className="overview__nav" aria-label="Quick links">
        {[
          ["library", "Design Library"],
          ["generate", "AI Pipeline"],
          ["quality", "Quality & Validation"],
          ["requirements", "Requirements & Evidence"],
          ["runs", "Runs & Reports"],
        ].map(([id, label]) => (
          <button key={id} type="button" className="btn" onClick={() => onNavigate(id)}>
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
