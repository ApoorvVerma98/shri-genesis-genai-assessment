import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import { writeAssessmentTraceabilityReports } from "../assessment-audit.js";

async function main() {
  const data = await writeAssessmentTraceabilityReports();
  console.log(
    JSON.stringify(
      {
        canonicalManifestPath: data.canonicalManifestPath,
        blockers: data.blockers,
        provenance: data.reconciliation.provenance,
        requirements: data.requirements.length,
        reports: [
          "reports/assessment-traceability.json",
          "reports/assessment-traceability.md",
          "reports/assessment-reconciliation.json",
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
