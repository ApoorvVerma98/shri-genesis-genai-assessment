import { describe, expect, it } from "vitest";
import { resolveBatchCollection, targetedRunManifestRelPath } from "./batch-collection.js";

describe("resolveBatchCollection", () => {
  it("uses assessment for legacy count batches", () => {
    expect(resolveBatchCollection({ count: 100, seed: 42 })).toBe("assessment");
  });

  it("uses targeted when segments are present", () => {
    expect(
      resolveBatchCollection({
        segments: [{ category: "healthcare", layoutFamily: "quote-banner", count: 10 }],
        seed: 42,
      }),
    ).toBe("targeted");
  });
});

describe("targetedRunManifestRelPath", () => {
  it("places manifests under runs/", () => {
    expect(targetedRunManifestRelPath("abc123")).toBe("runs/abc123/manifest.json");
  });
});
