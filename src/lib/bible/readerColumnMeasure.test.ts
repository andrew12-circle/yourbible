import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { buildHolmanConnectionsMeasureHtml, buildHolmanPageFootnotesMeasureHtml } from "@/lib/bible/holmanStudyLayout";
import {
  applyHolmanStudyMeasureHtml,
  applyScriptureColumnMeasureHtml,
  readerColumnContentHeightPx,
  scriptureColumnWrapperStyle,
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

  it("readerColumnContentHeightPx matches paginator content limits", () => {
    expect(
      readerColumnContentHeightPx({
        columnLayoutActive: true,
        measuresFirstPage: true,
        startsWithChapterHeader: true,
        firstPageHeight: 520,
        pageHeight: 600,
      }),
    ).toBe(488);
    expect(
      readerColumnContentHeightPx({
        columnLayoutActive: true,
        measuresFirstPage: false,
        startsWithChapterHeader: true,
        firstPageHeight: 520,
        pageHeight: 600,
      }),
    ).toBe(472);
    expect(
      readerColumnContentHeightPx({
        columnLayoutActive: true,
        measuresFirstPage: false,
        startsWithChapterHeader: false,
        firstPageHeight: 520,
        pageHeight: 600,
      }),
    ).toBe(568);
    expect(
      readerColumnContentHeightPx({
        columnLayoutActive: false,
        measuresFirstPage: false,
        startsWithChapterHeader: false,
        firstPageHeight: 520,
        pageHeight: 600,
      }),
    ).toBeUndefined();
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

  it("scriptureContentFitsPage rejects clipped vertical overflow in columns", () => {
    applyScriptureColumnMeasureHtml(
      node,
      "<p class='scripture-paragraph'>alpha</p>",
      "scripture-columns-2",
      80,
    );
    const col = node.firstElementChild as HTMLElement;
    Object.defineProperty(col, "scrollWidth", { configurable: true, get: () => 320 });
    Object.defineProperty(col, "clientWidth", { configurable: true, get: () => 320 });
    Object.defineProperty(col, "scrollHeight", { configurable: true, get: () => 140 });

    expect(scriptureContentFitsPage(node, 80, "scripture-columns-2")).toBe(false);
  });

  it("scriptureContentFitsPage rejects implicit overflow columns via scrollWidth", () => {
    applyScriptureColumnMeasureHtml(
      node,
      "<p class='scripture-paragraph'>alpha</p>",
      "scripture-columns-2",
      80,
    );
    const col = node.firstElementChild as HTMLElement;
    Object.defineProperty(col, "scrollWidth", { configurable: true, get: () => 500 });
    Object.defineProperty(col, "clientWidth", { configurable: true, get: () => 320 });
    Object.defineProperty(col, "scrollHeight", { configurable: true, get: () => 80 });

    expect(scriptureContentFitsPage(node, 80, "scripture-columns-2")).toBe(false);
  });

  it("applyScriptureColumnMeasureHtml can render four columns for spread measurement", () => {
    applyScriptureColumnMeasureHtml(
      node,
      "<p class='scripture-paragraph'>alpha</p>",
      "scripture-columns-2",
      120,
      { columnCount: 4, measureWidthPx: 640 },
    );
    const col = node.firstElementChild as HTMLElement;
    expect(col.style.columns).toBe("4");
    expect(col.style.width).toBe("640px");
  });

  it("scriptureContentFitsPage rejects clipped holman scripture above connections", () => {
    const connections = buildHolmanConnectionsMeasureHtml(
      [
        {
          chapter: 1,
          verses: [
            {
              number: 1,
              text: "In the beginning",
              parts: [
                { kind: "text", text: "In the beginning" },
                { kind: "crossref", label: "Gn 1:1", book: "Gen", chapter: 1, verse: 1, letter: "a" },
              ],
            },
          ],
        },
      ],
      (s) => s,
      false,
    );
    applyHolmanStudyMeasureHtml(
      node,
      "<p class='scripture-paragraph'>" + "word ".repeat(120) + "</p>",
      connections,
      "",
      "scripture-columns-2",
      120,
    );
    node.classList.add("reader-holman-study");
    const stack = node.querySelector(".holman-study-stack") as HTMLElement;
    const columns = stack.querySelector(".scripture-columns-2") as HTMLElement;
    Object.defineProperty(columns, "scrollWidth", { configurable: true, get: () => 320 });
    Object.defineProperty(columns, "clientWidth", { configurable: true, get: () => 320 });
    Object.defineProperty(columns, "scrollHeight", { configurable: true, get: () => 220 });
    Object.defineProperty(columns, "clientHeight", { configurable: true, get: () => 80 });
    Object.defineProperty(stack, "scrollHeight", { configurable: true, get: () => 120 });

    expect(scriptureContentFitsPage(node, 120, "scripture-columns-2")).toBe(false);
  });

  it("scriptureContentFitsPage rejects clipped inline scripture above page footnotes", () => {
    const footnotes = buildHolmanPageFootnotesMeasureHtml(
      [
        {
          chapter: 1,
          verses: [
            {
              number: 1,
              text: "In the beginning",
              parts: [
                { kind: "text", text: "In the beginning" },
                { kind: "footnote", marker: 1, text: "Lit sons" },
              ],
            },
          ],
        },
      ],
      (s) => s,
    );
    applyHolmanStudyMeasureHtml(
      node,
      "<p class='scripture-paragraph'>" + "word ".repeat(120) + "</p>",
      "",
      footnotes,
      "scripture-columns-2",
      120,
    );
    const stack = node.querySelector(".scripture-page-stack") as HTMLElement;
    const columns = stack.querySelector(".scripture-columns-2") as HTMLElement;
    Object.defineProperty(columns, "scrollWidth", { configurable: true, get: () => 320 });
    Object.defineProperty(columns, "clientWidth", { configurable: true, get: () => 320 });
    Object.defineProperty(columns, "scrollHeight", { configurable: true, get: () => 220 });
    Object.defineProperty(columns, "clientHeight", { configurable: true, get: () => 80 });
    Object.defineProperty(stack, "scrollHeight", { configurable: true, get: () => 120 });

    expect(scriptureContentFitsPage(node, 120, "scripture-columns-2")).toBe(false);
  });
});
