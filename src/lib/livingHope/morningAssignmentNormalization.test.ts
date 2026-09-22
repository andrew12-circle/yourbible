import { describe, expect, it } from "vitest";
import { DAILY_ASSIGNMENT_FIELDS, emptyDailyAssignment, parseConnectionNotes } from "./morningRitual";

describe("assignment normalization follows the current shared fields", () => {
  it("preserves every configured assignment field", () => {
    const input = Object.fromEntries(DAILY_ASSIGNMENT_FIELDS.map(({ key }) => [key, `Saved ${key}`]));
    expect(parseConnectionNotes({ daily_assignment: input }).daily_assignment).toEqual(input);
  });
  it("keeps legacy records complete without replacing existing writing", () => {
    expect(parseConnectionNotes({ daily_assignment: { spiritual: "Pray" } }).daily_assignment)
      .toEqual({ ...emptyDailyAssignment(), spiritual: "Pray" });
  });
});
