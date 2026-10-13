import type { AssessmentOverviewData, DesignEntry, Manifest } from "../types";

interface QualityOverviewProps {
  assessmentManifest: Manifest | null;
  assessmentEntries: DesignEntry[];
  targetedManifest: Manifest | null;
  targetedEntries: DesignEntry[];
  assessmentModes: { ai: number; fallback: number; unknown: number; provenanceResolved?: boolean };
  targetedModes: { ai: number; fallback: number; unknown: number };
  overview?: AssessmentOverviewData | null;
}

function ManifestBlock({
  title,
  manifest,
  entries,
  modes,
}: {
  title: string;
  manifest: Manifest | null;
  entries: DesignEntry[];
  modes: { ai: number; fallback: number; unknown: number };
}) {
  const failedValidation = entries.filter((e) => e.validationStatus !== "passed");

  return (
    <section className="panel" style={{ maxWidth: 720, marginBottom: 24 }}>
      <h2 style={{ margin: "0 0 12px", fontSize: "1.125rem" }}>{title}</h2>
      {!manifest && entries.length === 0 ? (
        <p className="card-meta">No data loaded.</p>
      ) : (
        <>
          {manifest?.aggregateProvenanceNote && (
            <div className="alert alert--info" role="note">{manifest.aggregateProvenanceNote}</div>
          )}
          <dl className="modal__meta" style={{ padding: 0, border: 0 }}>
            <div className="meta-row">
              <dt>Generated</dt>
              <dd>{manifest?.generated ?? entries.length}</dd>
            </div>
            <div className="meta-row">
              <dt>Validation passed</dt>
              <dd>{manifest?.validationPassed ?? entries.filter((e) => e.validationStatus === "passed").length}</dd>
            </div>
            <div className="meta-row">
              <dt>AI content</dt>
              <dd>{modes.ai}</dd>
            </div>
            <div className="meta-row">
              <dt>Fallback content</dt>
              <dd>{modes.fallback}</dd>
            </div>
            <div className="meta-row">
              <dt>Unknown provenance</dt>
              <dd>{modes.unknown}</dd>
            </div>
            {manifest?.aiFailedThenFallback !== undefined && manifest.aiFailedThenFallback > 0 && (
              <div className="meta-row">
                <dt>AI → fallback</dt>
                <dd>{manifest.aiFailedThenFallback}</dd>
              </div>
            )}
          </dl>
          {failedValidation.length > 0 && (
            <div className="alert alert--error" style={{ marginTop: 16 }}>
              {failedValidation.length} design(s) failed validation.
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function QualityOverview(props: QualityOverviewProps) {
  const recon = props.overview;
  return (
    <div>
      <p style={{ maxWidth: 720 }}>
        Technical validation reflects SVG structure and content rules—not subjective visual quality.
        Passing structural checks does not mean a design is visually professional.
      </p>
      {recon && (
        <section className="panel" style={{ maxWidth: 720, marginBottom: 16 }}>
          <h3 className="panel__title">Automated reconciliation</h3>
          <p className="card-meta">
            Duplicate headline groups: {recon.duplicateHeadlineGroups ?? "—"} · Near-duplicate pairs:{" "}
            {recon.nearDuplicatePairs ?? "—"} · Orphan SVGs: {recon.orphanSvgCount ?? "—"} · Missing
            files: {recon.missingSvg ?? 0}
          </p>
          <p className="card-meta">Manual visual QA: see reports/visual-qa-report.md</p>
        </section>
      )}
      <ManifestBlock
        title="Assessment collection"
        manifest={props.assessmentManifest}
        entries={props.assessmentEntries}
        modes={props.assessmentModes}
      />
      <ManifestBlock
        title="Latest targeted session"
        manifest={props.targetedManifest}
        entries={props.targetedEntries}
        modes={props.targetedModes}
      />
    </div>
  );
}
