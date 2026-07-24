import { describe, expect, it } from "vitest";
import { canonicalBundleUrl } from "@/lib/bible/canonical/bundleLoader";

describe("canonicalBundleUrl", () => {
  it("uses Vite's base path for bundled Bible chapter assets", () => {
    expect(canonicalBundleUrl("Jhn", 1, "/pwa/")).toBe("/pwa/bibles/csb/chapters/Jhn/1.json");
  });

  it("normalizes a base path without a trailing slash", () => {
    expect(canonicalBundleUrl("1 Co", 13, "/app")).toBe("/app/bibles/csb/chapters/1%20Co/13.json");
  });
});
