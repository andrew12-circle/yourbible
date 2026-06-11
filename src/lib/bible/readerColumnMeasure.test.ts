import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  applyScriptureColumnMeasureHtml,
  scriptureContentFitsPage,
} from "./readerColumnMeasure";

describe("readerColumnMeasure", () => {
  let node: HTMLDivElement;

  beforeEach(() => {
    node = document.createElement("div");
    node.style.width = "320px";
    document.body.appendChild(node);
  });

  afterEach(() => {
    node.remove();
  });

  it("applies fixed height to the column wrapper for two-column measurement", () => {
    applyScriptureColumnMeasureHtml(
      node,
      "<p class='scripture-paragraph'>alpha</p>",
      "scripture-columns-2",
      120,
    );
    const col = node.firstElementChild as HTMLElement;
    expect(col.className).toBe("scripture-columns-2");
    expect(col.style.height).toBe("120px");
    expect(col.style.overflow).toBe("hidden");
  });
});
