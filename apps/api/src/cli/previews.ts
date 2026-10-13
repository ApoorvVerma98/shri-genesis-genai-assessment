import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import type { ManifestEntry } from "@vector-forge/shared";
import fs from "node:fs/promises";
import path from "node:path";
import { getManifestPath, REPORTS_DIR, resolveOutputDir } from "../paths.js";

function pickDiverse(entries: ManifestEntry[], n: number): ManifestEntry[] {
  const picked: ManifestEntry[] = [];
  const seenCat = new Set<string>();
  const seenLayout = new Set<string>();
  for (const e of entries) {
    if (e.validationStatus !== "passed" || !e.outputPath) continue;
    const needCat = !seenCat.has(e.category);
    const needLayout = !seenLayout.has(e.layoutFamily);
    if (needCat || needLayout || picked.length < n) {
      picked.push(e);
      seenCat.add(e.category);
      seenLayout.add(e.layoutFamily);
    }
    if (picked.length >= n) break;
  }
  if (picked.length < n) {
    for (const e of entries) {
      if (picked.includes(e)) continue;
      if (e.validationStatus === "passed" && e.outputPath) picked.push(e);
      if (picked.length >= n) break;
    }
  }
  return picked.slice(0, n);
}

async function main() {
  const raw = await fs.readFile(getManifestPath(), "utf8");
  const manifest = JSON.parse(raw) as { entries: ManifestEntry[] };
  const sample = pickDiverse(manifest.entries, 12);
  const previewDir = path.join(resolveOutputDir(), "previews");
  await fs.mkdir(previewDir, { recursive: true });

  const cards = sample
    .map((e) => {
      const rel = e.outputPath.replace(/\\/g, "/");
      return `
      <figure class="card">
        <object type="image/svg+xml" data="../${rel}" aria-label="${e.id}"></object>
        <figcaption><strong>${e.id}</strong><br/>${e.category} · ${e.layoutFamily}<br/><span class="mode">${e.contentMode}</span></figcaption>
      </figure>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>VectorForge Contact Sheet</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 24px; }
    h1 { font-weight: 600; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .card { background: #1e293b; border-radius: 12px; padding: 12px; border: 1px solid #334155; }
    object { width: 100%; height: 180px; border-radius: 8px; background: #fff; }
    figcaption { font-size: 12px; margin-top: 8px; line-height: 1.4; }
    .mode { color: #38bdf8; }
  </style>
</head>
<body>
  <h1>VectorForge — Preview Contact Sheet</h1>
  <p>${sample.length} designs (diverse categories & layouts). Full SVGs remain under <code>outputs/</code>.</p>
  <div class="grid">${cards}</div>
</body>
</html>`;

  const outPath = path.join(previewDir, "contact-sheet.html");
  await fs.writeFile(outPath, html, "utf8");
  console.log(`Contact sheet: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
