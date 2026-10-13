import { useMemo, useState } from "react";

import type { AppView } from "./types";

import { useStudioData } from "./hooks/useStudioData";
import { useTheme } from "./hooks/useTheme";

import { AssessmentQuality } from "./components/AssessmentQuality";

import { DesignLibrary } from "./components/DesignLibrary";

import { GenerateStudio } from "./components/GenerateStudio";
import { ThemeToggle } from "./components/ThemeToggle";



const NAV: { id: AppView; label: string }[] = [

  { id: "generate", label: "Generate Studio" },

  { id: "library", label: "Design Library" },

  { id: "quality", label: "Assessment & Quality" },

];



const LEGACY_VIEW_MAP: Record<string, AppView> = {

  overview: "quality",

  requirements: "quality",

  runs: "quality",

  generate: "generate",

  library: "library",

  quality: "quality",

};



export default function App() {

  const initialView = (): AppView => {

    const hash = window.location.hash.replace(/^#/, "");

    if (hash && LEGACY_VIEW_MAP[hash]) return LEGACY_VIEW_MAP[hash];

    return "generate";

  };



  const [view, setView] = useState<AppView>(initialView);

  const [navOpen, setNavOpen] = useState(true);

  const { preference, setPreference } = useTheme();

  const studio = useStudioData();

  const {

    ai,

    assessmentEntries,

    assessmentManifest,

    targetedEntries,

    targetedManifest,

    batch,

    loading,

    refreshing,

    error,

    batchError,

    refresh,

    runBatch,

    assessmentModes,

    targetedModes,

    metaCategories,

    metaLayoutFamilies,

    overview,

    requirements,

    runHistory,

    reportIndex,

  } = studio;



  const categories = useMemo(

    () => [...new Set(assessmentEntries.map((e) => e.category))].sort(),

    [assessmentEntries],

  );

  const layouts = useMemo(

    () => [...new Set(assessmentEntries.map((e) => e.layoutFamily))].sort(),

    [assessmentEntries],

  );



  const pageMeta: Record<AppView, { title: string; desc: string }> = {

    generate: {

      title: "Generate Studio",

      desc: "Demonstrate the AI → structured brief → SVG pipeline with provenance and validation.",

    },

    library: {

      title: "Design Library",

      desc: "Browse the canonical assessment collection (vf-0001…vf-0100).",

    },

    quality: {

      title: "Assessment & Quality",

      desc: "Requirements traceability, validation truth, runs, and submission readiness.",

    },

  };



  const providerConfigured = ai?.configured && ai.provider !== "fallback";

  const dotClass = providerConfigured ? "status-chip__dot--ok" : "status-chip__dot--warn";



  function navigate(v: AppView) {

    setView(v);

    window.location.hash = v;

  }



  return (

    <div className="shell">

      <aside className={`sidebar ${navOpen ? "" : "sidebar--collapsed"}`} aria-label="Main navigation">

        <div className="brand">

          <div className="brand__row">

            <h1 className="brand__title">VectorForge</h1>

            <button

              type="button"

              className="btn btn--ghost mobile-nav-toggle"

              onClick={() => setNavOpen((o) => !o)}

              aria-expanded={navOpen}

              aria-label="Toggle navigation"

            >

              Menu

            </button>

          </div>

          <p className="brand__tag">Assessment Studio</p>

        </div>

        <nav className="nav">

          {NAV.map((item) => (

            <button

              key={item.id}

              type="button"

              className={`nav__link ${view === item.id ? "nav__link--active" : ""}`}

              onClick={() => navigate(item.id)}

            >

              {item.label}

            </button>

          ))}

        </nav>

        <div className="sidebar__footer">

          <ThemeToggle preference={preference} onChange={setPreference} />

        </div>

      </aside>



      <div className="main">

        <header className="page-header">

          <div className="page-header__row">

            <div>

              <h1 className="page-header__title">{pageMeta[view].title}</h1>

              <p className="page-header__desc">{pageMeta[view].desc}</p>

            </div>

            <div className="page-header__actions">

              {ai && (

                <div className="status-chip" title={ai.message}>

                  <span className={`status-chip__dot ${dotClass}`} aria-hidden />

                  <span>

                    Provider: <strong>{ai.provider}</strong>

                    {ai.model ? ` · ${ai.model}` : ""}

                  </span>

                </div>

              )}

              <button type="button" className="btn" onClick={() => refresh()} disabled={refreshing}>

                {refreshing ? "Refreshing…" : "Refresh data"}

              </button>

            </div>

          </div>

        </header>



        <main className="content">

          {loading && <p className="loading-banner" role="status">Loading studio data…</p>}

          {error && <div className="alert alert--error" role="alert">{error}</div>}



          {view === "generate" && (

            <GenerateStudio

              batch={batch}

              batchError={batchError}

              categories={metaCategories.length ? metaCategories : categories}

              layoutFamilies={metaLayoutFamilies.length ? metaLayoutFamilies : layouts}

              onRunBatch={runBatch}

              disabled={batch.running}

              overview={overview}

              loadingOverview={loading}

            />

          )}



          {view === "library" && (

            <DesignLibrary

              entries={assessmentEntries}

              categories={categories}

              layouts={layouts}

              catalogueCategories={metaCategories}

              catalogueLayouts={metaLayoutFamilies}

            />

          )}



          {view === "quality" && (

            <AssessmentQuality

              overview={overview}

              requirements={requirements}

              loading={loading}

              assessmentManifest={assessmentManifest}

              assessmentEntries={assessmentEntries}

              targetedManifest={targetedManifest}

              targetedEntries={targetedEntries}

              assessmentModes={assessmentModes}

              targetedModes={targetedModes}

              runHistory={runHistory}

              reportIndex={reportIndex}

            />

          )}

        </main>

      </div>

    </div>

  );

}

