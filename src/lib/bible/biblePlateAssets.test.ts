import { describe, expect, it } from "vitest";
import { biblePlateAssetUrl, studyMapAssetUrl } from "./biblePlateAssets";

describe("biblePlateAssets", () => {
  it("uses deterministic local WebP paths for plates", () => {
    expect(biblePlateAssetUrl({ id: "dore-001-gen-1" })).toBe(
      "/bible-plates/dore-001-gen-1.webp",
    );
  });

  it("keeps study maps in the local plate asset tree", () => {
    expect(studyMapAssetUrl({ id: "abraham" })).toBe(
      "/bible-plates/maps/abraham.webp",
    );
  });
});
