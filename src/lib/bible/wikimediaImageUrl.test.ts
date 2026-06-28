import { describe, expect, it } from "vitest";
import { doreCommonsFilename, wikimediaThumbUrl } from "./wikimediaImageUrl";

describe("wikimediaImageUrl", () => {
  it("builds Special:FilePath thumb URLs", () => {
    const url = wikimediaThumbUrl("001.The_Creation_of_Light.jpg");
    expect(url).toContain("Special:FilePath");
    expect(url).toContain("width=960");
  });

  it("builds Doré filenames from plate number and title", () => {
    expect(doreCommonsFilename(1, "The Creation of Light")).toBe(
      "001.The_Creation_of_Light.jpg",
    );
  });
});
