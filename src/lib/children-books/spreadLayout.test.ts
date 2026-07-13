import { describe, expect, it } from "vitest";
import {
  isTextOnlyLayout,
  resolvePictureBookTextPosition,
} from "@/lib/children-books/spreadLayout";

describe("spreadLayout", () => {
  it("places text above art on left pages", () => {
    expect(resolvePictureBookTextPosition("picture-book", "left")).toBe("top");
  });

  it("places art above text on right pages", () => {
    expect(resolvePictureBookTextPosition("picture-book", "right")).toBe("bottom");
  });

  it("uses a text pocket for immersive art pages", () => {
    expect(resolvePictureBookTextPosition("text-pocket", "left")).toBe("pocket");
    expect(resolvePictureBookTextPosition("text-pocket", "right")).toBe("pocket");
  });

  it("keeps full-spread pages flowing toward the gutter", () => {
    expect(resolvePictureBookTextPosition("full-spread", "left")).toBe("bottom");
    expect(resolvePictureBookTextPosition("full-spread", "right")).toBe("top");
  });

  it("fills text-only pages with copy", () => {
    expect(resolvePictureBookTextPosition("text-only", "left")).toBe("top");
    expect(isTextOnlyLayout("text-only")).toBe(true);
    expect(isTextOnlyLayout("picture-book")).toBe(false);
  });
});
