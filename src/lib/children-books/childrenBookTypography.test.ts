import { describe, expect, it } from "vitest";
import { childrenBookBodyClassName } from "@/lib/children-books/childrenBookTypography";

describe("childrenBookTypography", () => {
  it("shrinks body copy as paragraphs grow longer", () => {
    expect(childrenBookBodyClassName("Short line.")).toContain("1.3rem");
    expect(childrenBookBodyClassName("x".repeat(150))).toContain("1.22rem");
    expect(childrenBookBodyClassName("x".repeat(220))).toContain("1.14rem");
    expect(childrenBookBodyClassName("x".repeat(300))).toContain("1.05rem");
  });
});
