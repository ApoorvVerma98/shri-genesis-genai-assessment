import { useMemo, useState } from "react";
import type { TraceabilityRequirement } from "../types";

interface RequirementsEvidenceProps {
  requirements: TraceabilityRequirement[];
  loading: boolean;
}

export function RequirementsEvidence({ requirements, loading }: RequirementsEvidenceProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");

  const areas = useMemo(
    () => [...new Set(requirements.map((r) => r.area))].sort(),
    [requirements],
  );

  const filtered = requirements.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (areaFilter !== "all" && r.area !== areaFilter) return false;
    return true;
  });

  if (loading) return <p className="card-meta">Loading traceability…</p>;

  return (
    <div className="panel panel--wide">
      <h2 className="panel__title">Requirements &amp; evidence</h2>
      <div className="filters-row">
        <label className="field">
          <span className="field__label">Status</span>
          <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            {["verified", "demonstrated", "partial", "implemented", "failed", "not_verified"].map(
              (s) => (
                <option key={s} value={s}>{s}</option>
              ),
            )}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Area</span>
          <select className="select" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
            <option value="all">All</option>
            {areas.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="trace-table">
        {filtered.map((r) => (
          <article key={r.id} className="trace-row">
            <div className="trace-row__head">
              <span className="badge">{r.id}</span>
              <span className={`badge badge--status-${r.status}`}>{r.status}</span>
              <strong>{r.title}</strong>
            </div>
            <p className="card-meta">{r.meaning}</p>
            <p><em>Verification:</em> {r.verification}</p>
            {r.implementation.length > 0 && (
              <p><em>Code:</em> {r.implementation.join(", ")}</p>
            )}
            {r.evidence.length > 0 && (
              <p><em>Evidence:</em> {r.evidence.join("; ")}</p>
            )}
            {r.remainingWork && (
              <p className="alert alert--info">{r.remainingWork}</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
