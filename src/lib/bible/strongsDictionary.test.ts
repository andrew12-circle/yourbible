import { describe, expect, it } from "vitest";
import { extractStrongsIdsFromText, parseStrongsQuery } from "./strongsDictionary";

describe("strongsDictionary", () => {
  it("parses explicit H and G ids", () => {
    expect(parseStrongsQuery("H430")).toEqual({ id: "H430", lang: "hebrew" });
    expect(parseStrongsQuery("g26")).toEqual({ id: "G26", lang: "greek" });
  });

  it("extracts ids from footnote text", () => {
    expect(extractStrongsIdsFromText("See H430 and G26 in note")).toEqual(["H430", "G26"]);
  });
});
