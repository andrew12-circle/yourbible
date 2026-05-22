import { describe, expect, it } from "vitest";
import { formatUsd, formatTokenCount } from "./usageFormat";

describe("usageFormat", () => {
  it("formats USD", () => {
    expect(formatUsd(0)).toBe("$0.00");
    expect(formatUsd(0.004)).toBe("<$0.01");
    expect(formatUsd(1.5)).toBe("$1.50");
  });

  it("formats token counts", () => {
    expect(formatTokenCount(500)).toBe("500");
    expect(formatTokenCount(2500)).toBe("2.5k");
    expect(formatTokenCount(2_000_000)).toBe("2.0M");
  });
});
