interface SummaryStatsProps {
  total: number;
  validationPassed: number;
  validationFailed: number;
  failed: number;
  aiGenerated: number;
  fallbackGenerated: number;
  unknownProvenance?: number;
}

export function SummaryStats({
  total,
  validationPassed,
  validationFailed,
  failed,
  aiGenerated,
  fallbackGenerated,
  unknownProvenance = 0,
}: SummaryStatsProps) {
  if (total === 0) return null;

  return (
    <div className="stats" role="region" aria-label="Manifest summary">
      <div className="stat">
        <div className="stat__label">Total designs</div>
        <div className="stat__value">{total}</div>
      </div>
      <div className="stat">
        <div className="stat__label">Validation passed</div>
        <div className="stat__value">{validationPassed}</div>
      </div>
      <div className="stat">
        <div className="stat__label">Validation failed</div>
        <div className="stat__value">{validationFailed}</div>
      </div>
      <div className="stat">
        <div className="stat__label">Gen. errors</div>
        <div className="stat__value">{failed}</div>
      </div>
      <div className="stat">
        <div className="stat__label">AI content</div>
        <div className="stat__value">{aiGenerated}</div>
      </div>
      <div className="stat">
        <div className="stat__label">Fallback content</div>
        <div className="stat__value">{fallbackGenerated}</div>
      </div>
      {unknownProvenance > 0 && (
        <div className="stat">
          <div className="stat__label">Unknown provenance</div>
          <div className="stat__value">{unknownProvenance}</div>
        </div>
      )}
    </div>
  );
}
