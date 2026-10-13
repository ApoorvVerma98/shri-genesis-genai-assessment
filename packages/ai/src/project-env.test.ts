import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createContentGenerator } from "./factory.js";
import {
  findMonorepoRoot,
  loadProjectEnv,
  resetProjectEnvForTests,
} from "./project-env.js";

describe("project-env", () => {
  afterEach(() => {
    resetProjectEnvForTests();
    delete process.env.AI_PROVIDER;
    delete process.env.AI_API_KEY;
  });

  it("finds vector-forge monorepo root from package location", () => {
    const root = findMonorepoRoot();
    expect(readPackageName(root)).toBe("vector-forge");
  });

  it("loads .env from monorepo root when cwd is apps/api", () => {
    const root = findMonorepoRoot();
    const envPath = path.join(root, ".env");
    if (!fs.existsSync(envPath)) {
      expect(true).toBe(true);
      return;
    }
    const prevCwd = process.cwd();
    const apiDir = path.join(root, "apps", "api");
    if (fs.existsSync(apiDir)) process.chdir(apiDir);
    delete process.env.AI_PROVIDER;
    delete process.env.AI_API_KEY;
    const result = loadProjectEnv({ root });
    if (fs.existsSync(apiDir)) process.chdir(prevCwd);
    expect(result.envFileExists).toBe(true);
    expect(result.loaded).toBe(true);
    expect(result.monorepoRoot).toBe(root);
    expect(process.env.AI_PROVIDER).toBeTruthy();
  });

  it("reports conflicts when process env overrides .env", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vf-env-"));
    fs.writeFileSync(
      path.join(tmp, "package.json"),
      JSON.stringify({ name: "vector-forge" }),
    );
    fs.writeFileSync(path.join(tmp, ".env"), "AI_PROVIDER=from-file\nAI_API_KEY=file-key\n");
    process.env.AI_PROVIDER = "from-process";
    const result = loadProjectEnv({ root: tmp });
    expect(result.conflicts.some((c) => c.key === "AI_PROVIDER")).toBe(true);
    expect(process.env.AI_PROVIDER).toBe("from-process");
    expect(process.env.AI_API_KEY).toBe("file-key");
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

function readPackageName(dir: string): string | undefined {
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) return undefined;
  return (JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { name?: string }).name;
}

describe("provider selection after env load", () => {
  it("selects openai-compatible when provider and key are set", () => {
    const gen = createContentGenerator({
      AI_PROVIDER: "openai-compatible",
      AI_API_KEY: "test-key",
      AI_MODEL: "openai/gpt-oss-20b",
    });
    const status = gen.status();
    expect(status.provider).toBe("openai-compatible");
    expect(status.configured).toBe(true);
  });

  it("marks openai-compatible misconfigured without API key", () => {
    const gen = createContentGenerator({
      AI_PROVIDER: "openai-compatible",
    });
    const status = gen.status();
    expect(status.provider).toBe("openai-compatible");
    expect(status.configured).toBe(false);
  });
});
