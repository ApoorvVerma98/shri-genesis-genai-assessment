import type { DesignEntry } from "../types";
import { svgUrl } from "../api/client";

interface TargetedResultsProps {
  entries: DesignEntry[];
  batchRunId?: string;
  loading?: boolean;
}

export function TargetedResults({ entries, batchRunId, loading }: TargetedResultsProps) {
  if (loading) {
    return <p className="card-meta">Loading session results…</p>;
  }
  if (!entries.length) {
    return (
      <p className="card-meta">
        No targeted session results yet. Run a targeted batch above; results appear here without
        changing the assessment library.
      </p>
    );
  }

  return (
    <div className="targeted-results">
      <h3 className="panel__title" style={{ fontSize: "1rem" }}>
        This session {batchRunId ? `(${batchRunId})` : ""}
      </h3>
      <div className="grid-cards">
        {entries.map((e) => (
          <article key={e.id} className="card card--compact">
            {e.outputPath && (
              <object
                type="image/svg+xml"
                data={svgUrl(e.outputPath)}
                className="card-preview"
                aria-label={e.headline ?? e.topic}
              />
            )}
            <h4 className="card-title">{e.headline ?? e.topic}</h4>
            <p className="card-meta">
              {e.category} · {e.layoutFamily} · <strong>{e.contentMode}</strong>
            </p>
            {e.outputPath && (
              <a className="btn btn--ghost" href={svgUrl(e.outputPath)} download>
                Download SVG
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
