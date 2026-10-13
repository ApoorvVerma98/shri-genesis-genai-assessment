import { useMemo, useState, type MouseEvent } from "react";

import type { DesignEntry } from "../types";

import { svgUrl } from "../api/client";

import { categoryLabel, layoutLabel } from "../lib/layoutLabels";

import { DesignDetailModal } from "./DesignDetailModal";

import { SvgPreview } from "./SvgPreview";



export const REPRESENTATIVE_DESIGN_IDS = [

  "vf-0001", "vf-0002", "vf-0003", "vf-0004", "vf-0005", "vf-0006",

  "vf-0007", "vf-0008", "vf-0009", "vf-0010", "vf-0011", "vf-0012",

] as const;



interface DesignLibraryProps {

  entries: DesignEntry[];

  categories: string[];

  layouts: string[];

  catalogueCategories?: string[];

  catalogueLayouts?: string[];

}



export function DesignLibrary({

  entries,

  categories,

  layouts,

  catalogueCategories = [],

  catalogueLayouts = [],

}: DesignLibraryProps) {

  const categoryCounts = useMemo(() => {

    const m = new Map<string, number>();

    for (const e of entries) m.set(e.category, (m.get(e.category) ?? 0) + 1);

    return m;

  }, [entries]);

  const layoutCounts = useMemo(() => {

    const m = new Map<string, number>();

    for (const e of entries) m.set(e.layoutFamily, (m.get(e.layoutFamily) ?? 0) + 1);

    return m;

  }, [entries]);

  const [search, setSearch] = useState("");

  const [category, setCategory] = useState("");

  const [layout, setLayout] = useState("");

  const [selected, setSelected] = useState<DesignEntry | null>(null);



  const filtered = useMemo(() => {

    const q = search.trim().toLowerCase();

    return entries.filter((e) => {

      if (category && e.category !== category) return false;

      if (layout && e.layoutFamily !== layout) return false;

      if (!q) return true;

      const hay = [e.id, e.topic, e.headline, e.category, e.layoutFamily, layoutLabel(e.layoutFamily)]

        .filter(Boolean)

        .join(" ")

        .toLowerCase();

      return hay.includes(q);

    });

  }, [entries, category, layout, search]);



  const hasFilters = search || category || layout;



  const showcase = useMemo(

    () =>

      REPRESENTATIVE_DESIGN_IDS.map((id) => entries.find((e) => e.id === id)).filter(

        (e): e is DesignEntry => !!e,

      ),

    [entries],

  );



  function clearFilters() {

    setSearch("");

    setCategory("");

    setLayout("");

  }



  function openInspect(e: DesignEntry, ev?: MouseEvent) {

    ev?.stopPropagation();

    setSelected(e);

  }



  return (

    <>

      <header className="library-header">

        <div>

          <h2 className="library-header__title">Canonical assessment gallery</h2>

          <p className="library-header__desc">

            Deliverables <code>vf-0001</code>–<code>vf-0100</code> from{" "}

            <code>outputs/assessment/manifest.json</code> — not targeted-run outputs.

          </p>

        </div>

        <p className="library-header__count" aria-live="polite">

          <strong>{filtered.length}</strong> of {entries.length} designs

        </p>

      </header>



      {showcase.length > 0 && (

        <section className="showcase-strip" aria-label="Representative preview set">

          <div className="showcase-strip__head">

            <h3 className="showcase-strip__title">Representative set</h3>

            <span className="card-meta">{showcase.length} designs · aligns with contact sheet</span>

          </div>

          <div className="showcase-strip__scroll">

            {showcase.map((e) => (

              <article key={e.id} className="showcase-card">

                <button type="button" className="showcase-card__preview" onClick={() => setSelected(e)}>

                  <SvgPreview outputPath={e.outputPath} title={e.headline ?? e.topic} />

                </button>

                <div className="showcase-card__meta">

                  <span className="showcase-card__id">{e.id}</span>

                  <button type="button" className="btn btn--sm" onClick={() => setSelected(e)}>

                    Inspect

                  </button>

                </div>

              </article>

            ))}

          </div>

        </section>

      )}



      <div className="toolbar toolbar--library">

        <label className="search">

          <span className="sr-only">Search designs</span>

          <input

            className="input"

            type="search"

            placeholder="Search title, ID, topic, category, layout…"

            value={search}

            onChange={(ev) => setSearch(ev.target.value)}

          />

        </label>

        <select

          className="select select--filter"

          value={category}

          onChange={(ev) => setCategory(ev.target.value)}

          aria-label="Filter by category"

        >

          <option value="">All categories</option>

          {(catalogueCategories.length ? catalogueCategories : categories).map((c) => (

            <option key={c} value={c}>

              {categoryLabel(c)} ({categoryCounts.get(c) ?? 0})

            </option>

          ))}

        </select>

        <select

          className="select select--filter"

          value={layout}

          onChange={(ev) => setLayout(ev.target.value)}

          aria-label="Filter by layout"

        >

          <option value="">All layouts</option>

          {(catalogueLayouts.length ? catalogueLayouts : layouts).map((l) => (

            <option key={l} value={l}>

              {layoutLabel(l)} ({layoutCounts.get(l) ?? 0})

            </option>

          ))}

        </select>

        {hasFilters && (

          <button type="button" className="btn btn--ghost" onClick={clearFilters}>

            Clear filters

          </button>

        )}

      </div>



      {filtered.length === 0 ? (

        <div className="empty">

          <p>

            {entries.length === 0

              ? "No designs in the manifest yet."

              : "No designs match your filters."}

          </p>

          {hasFilters && (

            <button type="button" className="btn" onClick={clearFilters}>

              Clear filters

            </button>

          )}

        </div>

      ) : (

        <div className="gallery-grid gallery-grid--library">

          {filtered.map((e) => (

            <article key={e.id} className="design-card design-card--library">

              <div className="design-card__art">

                <SvgPreview outputPath={e.outputPath} title={e.headline ?? e.topic} />

              </div>

              <div className="card-body card-body--compact">

                <h3 className="card-title">{e.headline ?? e.topic}</h3>

                <div className="card-meta card-meta--tight">

                  {e.id} · {categoryLabel(e.category)}

                </div>

                <div className="badges">

                  <span className="badge badge--muted">{layoutLabel(e.layoutFamily)}</span>

                  <span className={`badge ${e.validationStatus === "passed" ? "badge--pass" : "badge--fail"}`}>

                    {e.validationStatus}

                  </span>

                  <span

                    className={`badge ${

                      e.contentMode === "ai"

                        ? "badge--ai"

                        : e.contentMode === "unknown"

                          ? "badge--unknown"

                          : "badge--fallback"

                    }`}

                  >

                    {e.contentMode}

                  </span>

                </div>

                <div className="card-actions">

                  <button type="button" className="btn btn--primary btn--sm" onClick={(ev) => openInspect(e, ev)}>

                    Inspect

                  </button>

                  {e.outputPath && (

                    <a

                      className="btn btn--sm"

                      href={svgUrl(e.outputPath)}

                      download={`${e.id}.svg`}

                      onClick={(ev) => ev.stopPropagation()}

                    >

                      Download

                    </a>

                  )}

                </div>

              </div>

            </article>

          ))}

        </div>

      )}



      {selected && <DesignDetailModal design={selected} onClose={() => setSelected(null)} />}

    </>

  );

}


