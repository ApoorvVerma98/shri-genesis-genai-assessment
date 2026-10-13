import { useEffect, useState } from "react";

interface SvgPreviewProps {
  outputPath: string;
  title: string;
  className?: string;
}

export function SvgPreview({ outputPath, title, className = "" }: SvgPreviewProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [outputPath]);

  if (!outputPath) {
    return (
      <div className={`preview-frame preview-frame--empty ${className}`} role="img" aria-label="No preview">
        <span className="preview-frame__placeholder">Preview unavailable</span>
      </div>
    );
  }

  const src = `/api/svg/${outputPath.replace(/^\//, "")}`;

  return (
    <div className={`preview-frame ${className}`}>
      {!loaded && !failed && (
        <span className="preview-frame__loading" aria-live="polite">Loading artwork…</span>
      )}
      {failed ? (
        <span className="preview-frame__placeholder" role="alert">
          Could not load SVG preview
        </span>
      ) : (
        <img
          src={src}
          alt={title}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
