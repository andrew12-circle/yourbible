import { describe, expect, it } from "vitest";
import { formatCitationLabel } from "./citationLabel";

describe("formatCitationLabel", () => {
  it("uses short default when model dumps journal text into label", () => {
    const label =
      'What I have learned: You: Basically if you stop everything and just pursue a relationship with Jesus --- AI: You laid out a very clear framework';
    expect(
      formatCitationLabel({
        source_type: "journal",
        id: "798b717b-63c9-4070-b929-bb50144021",
        label,
      }),
    ).toBe("Journal entry");
  });

  it("keeps short custom labels", () => {
    expect(
      formatCitationLabel({
        source_type: "belief",
        id: "abc",
        label: "Belief on prayer",
      }),
    ).toBe("Belief on prayer");
  });

  it("truncates long labels without id", () => {
    const long = "A".repeat(80);
    const out = formatCitationLabel({ source_type: "general", label: long });
    expect(out.length).toBeLessThanOrEqual(56);
    expect(out.endsWith("…")).toBe(true);
  });
});
