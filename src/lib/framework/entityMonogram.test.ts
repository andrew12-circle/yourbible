import { describe, expect, it } from "vitest";
import {
  entityKindSectionLabel,
  initialsFromName,
  isPersonEntityKind,
  monogramGradient,
} from "./entityMonogram";

describe("entityMonogram", () => {
  it("derives stable initials", () => {
    expect(initialsFromName("John the Baptist")).toBe("JT");
    expect(initialsFromName("Caleb")).toBe("CA");
  });

  it("builds a css gradient string", () => {
    expect(monogramGradient("Deborah")).toMatch(/^linear-gradient/);
  });

  it("splits person vs theme kinds", () => {
    expect(isPersonEntityKind("person")).toBe(true);
    expect(isPersonEntityKind("book")).toBe(false);
    expect(entityKindSectionLabel("person")).toBe("people");
    expect(entityKindSectionLabel("book")).toBe("themes");
  });
});
