import { bootstrapEnv } from "../config/bootstrap-env.js";

bootstrapEnv();
import type { Category, LayoutFamily } from "@vector-forge/shared";
import { buildSingleDesignSeed } from "@vector-forge/shared";
import { generateOne } from "../pipeline.js";

const seed = buildSingleDesignSeed(
  {
    category: process.argv[2] as Category | undefined,
    layoutFamily: process.argv[3] as LayoutFamily | undefined,
    topic: process.argv[4],
  },
  `cli-${Date.now()}`,
);

generateOne(seed, 0)
  .then(({ entry }) => {
    console.log(JSON.stringify(entry, null, 2));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
