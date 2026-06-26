import { describe, expect, it } from "vitest";
import { formatDisplayName, formatFormalGreetingName, resolveProfileDisplayName } from "./displayName";

describe("formatDisplayName", () => {
  it("title-cases spaced names", () => {
    expect(formatDisplayName("andrew heisley")).toBe("Andrew Heisley");
  });

  it("splits email-local separators", () => {
    expect(formatDisplayName("andrew.heisley")).toBe("Andrew Heisley");
    expect(formatDisplayName("andrew_heisley")).toBe("Andrew Heisley");
  });

  it("title-cases a single lowercase token", () => {
    expect(formatDisplayName("andrewheisley")).toBe("Andrewheisley");
  });
});

describe("formatFormalGreetingName", () => {
  it("uses Mr. and the last name", () => {
    expect(formatFormalGreetingName("Andrew Heisley")).toBe("Mr. Heisley");
    expect(formatFormalGreetingName("andrew.heisley")).toBe("Mr. Heisley");
  });
});

describe("resolveProfileDisplayName", () => {
  it("prefers profile display_name", () => {
    expect(
      resolveProfileDisplayName({ display_name: "Andrew Heisley" }, { email: "x@y.com" }),
    ).toBe("Andrew Heisley");
  });

  it("falls back to auth metadata before email", () => {
    expect(
      resolveProfileDisplayName(
        { display_name: null },
        { email: "andrewheisley@example.com", user_metadata: { display_name: "Andrew Heisley" } },
      ),
    ).toBe("Andrew Heisley");
  });

  it("formats email local part", () => {
    expect(
      resolveProfileDisplayName(null, { email: "andrew.heisley@example.com" }),
    ).toBe("Andrew Heisley");
  });
});
