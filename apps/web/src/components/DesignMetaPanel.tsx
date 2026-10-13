import type { DesignEntry } from "../types";
import { categoryLabel, layoutLabel } from "../lib/layoutLabels";

interface DesignMetaPanelProps {
  entry: DesignEntry;
  compact?: boolean;
}

export function DesignMetaPanel({ entry, compact }: DesignMetaPanelProps) {
  const validationFailed = entry.validationStatus !== "passed";
  const isFallback = entry.contentMode === "fallback";

  return (
    <dl className={`meta-panel ${compact ? "meta-panel--compact" : ""}`}>
      <div className="meta-row">
        <dt>Headline</dt>
        <dd>{entry.headline ?? entry.topic}</dd>
      </div>
      <div className="meta-row">
        <dt>Topic</dt>
        <dd>{entry.topic}</dd>
      </div>
      <div className="meta-row">
        <dt>Category</dt>
        <dd>{categoryLabel(entry.category)}</dd>
      </div>
      <div className="meta-row">
        <dt>Layout</dt>
        <dd>
          {layoutLabel(entry.layoutFamily)}
          <span className="meta-row__code">{entry.layoutFamily}</span>
        </dd>
      </div>
      <div className="meta-row">
        <dt>Content mode</dt>
        <dd>
          <span
            className={`badge ${
              entry.contentMode === "ai"
                ? "badge--ai"
                : entry.contentMode === "unknown"
                  ? "badge--unknown"
                  : "badge--fallback"
            }`}
          >
            {entry.contentMode}
          </span>
        </dd>
      </div>
      <div className="meta-row">
        <dt>AI attempted</dt>
        <dd>{entry.aiAttempted ? "Yes" : "No"}</dd>
      </div>
      {entry.aiProvider && (
        <div className="meta-row">
          <dt>Provider</dt>
          <dd>{entry.aiProvider}{entry.aiModel ? ` · ${entry.aiModel}` : ""}</dd>
        </div>
      )}
      <div className="meta-row">
        <dt>Validation</dt>
        <dd>
          <span className={`badge ${validationFailed ? "badge--fail" : "badge--pass"}`}>
            {entry.validationStatus}
          </span>
        </dd>
      </div>
      {isFallback && entry.fallbackReason && (
        <div className="meta-row meta-row--stack">
          <dt>Fallback reason</dt>
          <dd className="meta-row__pre">{entry.fallbackReason}</dd>
        </div>
      )}
      {entry.validationIssues && entry.validationIssues.length > 0 && (
        <div className="meta-row meta-row--stack">
          <dt>Validation issues</dt>
          <dd>
            <ul className="issue-list">
              {entry.validationIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </dd>
        </div>
      )}
      {validationFailed && (
        <p className="meta-panel__note" role="note">
          Structural validation failure does not always mean the SVG is empty — review issues above.
          Passing validation does not guarantee semantic or visual quality.
        </p>
      )}
    </dl>
  );
}
