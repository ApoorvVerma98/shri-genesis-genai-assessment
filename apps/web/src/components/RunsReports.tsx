import type { ReportIndexItem, RunHistoryResponse } from "../types";

interface RunsReportsProps {
  history: RunHistoryResponse | null;
  reports: ReportIndexItem[];
  loading: boolean;
}

export function RunsReports({ history, reports, loading }: RunsReportsProps) {
  if (loading) return <p className="card-meta">Loading runs and reports…</p>;

  return (
    <div className="runs-reports">
      <section className="panel">
        <h2 className="panel__title">Execution run (assessment CLI)</h2>
        {history?.executionRun ? (
          <dl className="modal__meta">
            <div className="meta-row">
              <dt>Status</dt>
              <dd>{history.executionRun.status}</dd>
            </div>
            <div className="meta-row">
              <dt>Run ID</dt>
              <dd>{history.executionRun.runId}</dd>
            </div>
            <div className="meta-row">
              <dt>Started</dt>
              <dd>{history.executionRun.startedAt}</dd>
            </div>
            {history.executionRun.error && (
              <div className="meta-row">
                <dt>Error</dt>
                <dd>{history.executionRun.error}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="card-meta">No execution-run.json</p>
        )}
        <p className="card-meta">
          Stale or interrupted runs are not treated as successful 100-design completions.
        </p>
      </section>

      <section className="panel">
        <h2 className="panel__title">Targeted batch history</h2>
        {history?.targetedRuns?.length ? (
          <ul className="overview__list">
            {history.targetedRuns.map((r) => (
              <li key={r.runId}>
                <strong>{r.runId}</strong> — {r.generated}/{r.requested} generated, AI {r.aiGenerated},
                fallback {r.fallbackGenerated}, validation passed {r.validationPassed}
              </li>
            ))}
          </ul>
        ) : (
          <p className="card-meta">No targeted runs.</p>
        )}
      </section>

      <section className="panel">
        <h2 className="panel__title">Reports on disk</h2>
        <ul className="overview__list">
          {reports.map((r) => (
            <li key={r.name}>
              <code>{r.path}</code> — {r.exists ? "present" : "missing"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
