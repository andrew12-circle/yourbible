import { describe, expect, it } from "vitest";
import { resolveDesktopPremiumStudyPane } from "./artifactDesktopStudyPane";

describe("resolveDesktopPremiumStudyPane", () => {
  it("defaults to overview", () => {
    expect(resolveDesktopPremiumStudyPane("")).toBe("overview");
    expect(resolveDesktopPremiumStudyPane("#overview")).toBe("overview");
    expect(resolveDesktopPremiumStudyPane("#key-insights")).toBe("overview");
  });

  it("maps claims tabs", () => {
    expect(resolveDesktopPremiumStudyPane("#claims")).toBe("claims");
    expect(resolveDesktopPremiumStudyPane("#claims-index")).toBe("claims");
  });
});
