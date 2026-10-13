import {
  ensureProjectEnv,
  formatEnvDiagnostics,
  getLastEnvLoadResult,
} from "@vector-forge/ai";

/**
 * Load monorepo root `.env` before reading AI_* variables.
 * Safe to call multiple times.
 */
export function bootstrapEnv(): void {
  const result = ensureProjectEnv();
  if (process.env.VF_ENV_DEBUG === "1") {
    console.error(formatEnvDiagnostics(result));
  }
}

export function getEnvBootstrapDiagnostics(): string {
  const result = getLastEnvLoadResult();
  return result ? formatEnvDiagnostics(result) : "env not loaded";
}
