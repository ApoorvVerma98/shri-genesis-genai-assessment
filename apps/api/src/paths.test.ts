import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

describe("resolveOutputDir", () => {
  afterEach(() => {
    delete process.env.OUTPUT_DIR;
  });

  it("resolves relative OUTPUT_DIR from repo root", async () => {
    process.env.OUTPUT_DIR = "outputs";
    const { REPO_ROOT, resolveOutputDir } = await import("./paths.js");
    expect(resolveOutputDir()).toBe(path.join(REPO_ROOT, "outputs"));
  });
});
