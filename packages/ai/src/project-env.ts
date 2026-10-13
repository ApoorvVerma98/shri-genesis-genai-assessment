import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MONOREPO_NAME = "vector-forge";
const ENV_FILE = ".env";

export interface EnvConflict {
  key: string;
  message: string;
}

export interface ProjectEnvLoadResult {
  monorepoRoot: string;
  envFilePath: string;
  envFileExists: boolean;
  loaded: boolean;
  loadError?: string;
  keysInFile: string[];
  /** Keys present in process.env before load that also appear in .env (file values skipped). */
  conflicts: EnvConflict[];
  cwd: string;
}

let lastLoadResult: ProjectEnvLoadResult | undefined;
let envInitialized = false;

function readPackageName(dir: string): string | undefined {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return undefined;
  try {
    const raw = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { name?: string };
    return raw.name;
  } catch {
    return undefined;
  }
}

/** Walk upward from `startDir` to locate the VectorForge monorepo root. */
export function findMonorepoRoot(startDir?: string): string {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [startDir, process.cwd(), moduleDir].filter(Boolean) as string[];

  for (const seed of candidates) {
    let dir = path.resolve(seed);
    for (let i = 0; i < 12; i++) {
      if (readPackageName(dir) === MONOREPO_NAME) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  return path.resolve(process.cwd());
}

/** Parse .env keys only (no values), for conflict reporting. */
export function listEnvFileKeys(envFilePath: string): string[] {
  if (!fs.existsSync(envFilePath)) return [];
  const keys: string[] = [];
  const lines = fs.readFileSync(envFilePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key) keys.push(key);
  }
  return keys;
}

/**
 * Load `.env` from the monorepo root. Existing `process.env` values are preserved
 * (dotenv does not override). Returns diagnostics without secret values.
 */
export function loadProjectEnv(options?: { root?: string }): ProjectEnvLoadResult {
  const monorepoRoot = options?.root ?? findMonorepoRoot();
  const envFilePath = path.join(monorepoRoot, ENV_FILE);
  const envFileExists = fs.existsSync(envFilePath);
  const keysInFile = envFileExists ? listEnvFileKeys(envFilePath) : [];

  const conflicts: EnvConflict[] = [];
  for (const key of keysInFile) {
    if (process.env[key] !== undefined) {
      conflicts.push({
        key,
        message:
          "Value already set in process environment; .env entry was not applied (dotenv precedence).",
      });
    }
  }

  let loaded = false;
  let loadError: string | undefined;
  if (envFileExists) {
    const result = dotenv.config({ path: envFilePath });
    if (result.error) {
      loadError = result.error.message;
    } else {
      loaded = true;
    }
  }

  lastLoadResult = {
    monorepoRoot,
    envFilePath,
    envFileExists,
    loaded,
    loadError,
    keysInFile,
    conflicts,
    cwd: process.cwd(),
  };
  return lastLoadResult;
}

export function ensureProjectEnv(): ProjectEnvLoadResult {
  if (!envInitialized) {
    const result = loadProjectEnv();
    envInitialized = true;
    return result;
  }
  return lastLoadResult ?? loadProjectEnv();
}

export function getLastEnvLoadResult(): ProjectEnvLoadResult | undefined {
  return lastLoadResult;
}

/** Reset for tests only. */
export function resetProjectEnvForTests(): void {
  envInitialized = false;
  lastLoadResult = undefined;
}

export function formatEnvDiagnostics(result: ProjectEnvLoadResult): string {
  const lines = [
    `cwd: ${result.cwd}`,
    `monorepoRoot: ${result.monorepoRoot}`,
    `envFile: ${result.envFilePath} (exists: ${result.envFileExists}, loaded: ${result.loaded})`,
  ];
  if (result.loadError) lines.push(`loadError: ${result.loadError}`);
  if (result.conflicts.length) {
    lines.push(
      `envConflicts: ${result.conflicts.map((c) => c.key).join(", ")} (process env overrides .env)`,
    );
  }
  return lines.join("\n");
}
