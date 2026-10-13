import { useEffect, useRef } from "react";
import type { DesignEntry } from "../types";
import { svgUrl } from "../api/client";
import { DesignMetaPanel } from "./DesignMetaPanel";
import { SvgPreview } from "./SvgPreview";

interface DesignDetailModalProps {
  design: DesignEntry;
  onClose: () => void;
}

export function DesignDetailModal({ design, onClose }: DesignDetailModalProps) {
  const title = design.headline ?? design.topic;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal modal--preview" role="dialog" aria-modal="true" aria-labelledby="design-modal-title">
        <div className="modal__header">
          <div>
            <h2 id="design-modal-title" className="modal__title">{title}</h2>
            <p className="modal__subtitle">{design.id}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn btn--ghost"
            onClick={onClose}
            aria-label="Close preview"
          >
            Close
          </button>
        </div>
        <div className="modal__preview modal__preview--large">
          <SvgPreview outputPath={design.outputPath} title={title} className="preview-frame--modal" />
        </div>
        <div className="modal__body">
          <DesignMetaPanel entry={design} />
        </div>
        <div className="modal__footer">
          {design.outputPath ? (
            <a className="btn btn--primary" href={svgUrl(design.outputPath)} download={`${design.id}.svg`}>
              Download SVG
            </a>
          ) : (
            <span className="card-meta">No file path — download unavailable</span>
          )}
          <button type="button" className="btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
