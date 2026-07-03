import { describe, expect, it } from "vitest";
import { formatLedgerAmount, parseLedgerAmount } from "@/lib/prayer/money";

describe("parseLedgerAmount", () => {
  it("parses currency strings", () => {
    expect(parseLedgerAmount("$1,250.50")).toBe(1250.5);
    expect(parseLedgerAmount("")).toBeNull();
  });
});

describe("formatLedgerAmount", () => {
  it("formats numbers", () => {
    expect(formatLedgerAmount(1250)).toMatch(/1,250/);
    expect(formatLedgerAmount(null)).toBe("—");
  });
});
