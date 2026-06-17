import { describe, expect, it } from "vitest";
import { buildOsmStaticMapUrl, computeMapViewport } from "./mapViewport";

describe("computeMapViewport", () => {
  it("returns null for empty points", () => {
    expect(computeMapViewport([])).toBeNull();
  });

  it("computes center and zoom for a single point", () => {
    const viewport = computeMapViewport([{ lat: 40.7, lng: -74.0 }]);
    expect(viewport).not.toBeNull();
    expect(viewport!.center.lat).toBeCloseTo(40.7, 1);
    expect(viewport!.center.lng).toBeCloseTo(-74.0, 1);
    expect(viewport!.zoom).toBeGreaterThan(0);
  });

  it("builds an OSM static map URL", () => {
    const url = buildOsmStaticMapUrl([{ lat: 40.7, lng: -74.0 }]);
    expect(url).toContain("staticmap.openstreetmap.de");
    expect(url).toContain("40.7");
  });
});
