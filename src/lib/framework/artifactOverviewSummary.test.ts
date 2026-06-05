import { describe, expect, it } from "vitest";
import { parseArtifactFrameworkOverview } from "./artifactOverviewSummary";

describe("parseArtifactFrameworkOverview", () => {
  it("returns null for missing or invalid metadata", () => {
    expect(parseArtifactFrameworkOverview(null)).toBeNull();
    expect(parseArtifactFrameworkOverview(undefined)).toBeNull();
    expect(parseArtifactFrameworkOverview({})).toBeNull();
    expect(parseArtifactFrameworkOverview({ framework_overview: "bad" })).toBeNull();
  });

  it("parses a valid framework_overview blob", () => {
    const result = parseArtifactFrameworkOverview({
      framework_overview: {
        summary: "The speaker emphasizes grace over performance.",
        key_points: ["Grace is unmerited", "Works follow faith"],
        framework_alignment: {
          aligns: ["You already hold that salvation is by grace."],
          conflicts: [],
          new_ground: ["They stress daily confession in a way you have not written down."],
        },
        generated_at: "2026-06-05T12:00:00.000Z",
      },
    });
    expect(result).toEqual({
      summary: "The speaker emphasizes grace over performance.",
      key_points: ["Grace is unmerited", "Works follow faith"],
      framework_alignment: {
        aligns: ["You already hold that salvation is by grace."],
        conflicts: [],
        new_ground: ["They stress daily confession in a way you have not written down."],
      },
      generated_at: "2026-06-05T12:00:00.000Z",
    });
  });
});
