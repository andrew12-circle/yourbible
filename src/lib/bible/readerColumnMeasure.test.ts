import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  applyScriptureColumnMeasureHtml,
  scriptureColumnWrapperStyle,
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

  it("scriptureColumnWrapperStyle sets pixel height for column-fill auto", () => {
    expect(scriptureColumnWrapperStyle(240)).toMatchObject({
      height: 240,
      maxHeight: 240,
      columnFill: "auto",
      overflow: "hidden",
    });
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
