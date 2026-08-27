import { describe, expect, it } from "vitest";
import { prioritizeMobileHomeApps, type HomeAppIcon } from "@/lib/home/homeApps";

function app(label: string): HomeAppIcon {
  return { label, color: "#000" };
}

describe("prioritizeMobileHomeApps", () => {
  it("puts journal-first iPhone workflows first and preserves every app", () => {
    const input = [app("Settings"), app("Bible"), app("Prayer"), app("Journal"), app("My AI"), app("Video journal")];
    const result = prioritizeMobileHomeApps(input);

    expect(result.map(({ label }) => label)).toEqual([
      "Video journal",
      "Journal",
      "Bible",
      "My AI",
      "Prayer",
      "Settings",
    ]);
    expect(result).toHaveLength(input.length);
  });
});
