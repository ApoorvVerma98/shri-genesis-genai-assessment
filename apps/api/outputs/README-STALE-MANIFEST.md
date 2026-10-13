# Stale manifest copy — do not use

This directory was created when `OUTPUT_DIR=outputs` resolved relative to `apps/api` cwd.

**Canonical assessment outputs:** `<repo-root>/outputs/`  
**Canonical manifest:** `<repo-root>/outputs/assessment/manifest.json`

The API and CLI now resolve `OUTPUT_DIR` relative to the monorepo root. This copy may disagree with the canonical manifest (e.g. fallback vs unknown provenance).
