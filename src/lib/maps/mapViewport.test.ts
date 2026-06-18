import { describe, expect, it } from "vitest";
import {
  buildGoogleStaticMapUrl,
  buildOsmEmbedMapUrl,
  buildOsmStaticMapUrl,
  computeMapViewport,
} from "./mapViewport";

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

  it("builds an OSM embed map URL", () => {
    const url = buildOsmEmbedMapUrl([{ lat: 40.7, lng: -74.0 }]);
    expect(url).toContain("openstreetmap.org/export/embed.html");
    expect(url).toContain("marker=40.7%2C-74");
  });

  it("builds a Google static map URL", () => {
    const url = buildGoogleStaticMapUrl([{ lat: 40.7, lng: -74.0 }], "test-key", {
      mapType: "roadmap",
    });
    expect(url).toContain("maps.googleapis.com/maps/api/staticmap");
    expect(url).toContain("test-key");
    expect(url).toContain("markers=color:red%7C40.7,-74");
  });
});
