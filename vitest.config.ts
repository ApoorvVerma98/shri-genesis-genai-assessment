import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    environment: "node",
    pool: "forks",
    deps: {
      optimizer: {
        ssr: {
          include: [
            "@vector-forge/shared",
            "@vector-forge/ai",
            "@vector-forge/svg-engine",
            "@vector-forge/validation",
          ],
        },
      },
    },
  },
});
