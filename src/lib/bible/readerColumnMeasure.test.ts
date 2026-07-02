import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { buildHolmanConnectionsMeasureHtml, buildHolmanPageFootnotesMeasureHtml } from "@/lib/bible/holmanStudyLayout";
import {
  applyHolmanStudyMeasureHtml,
  applyScriptureColumnMeasureHtml,
  paginatorMeasureLimitPx,
  paginatorSpreadPaneLimitPx,
  readerColumnContentHeightPx,
  readerPageContentLimitPx,
  scriptureColumnWrapperStyle,
  scriptureContentFitsPage,
  scriptureSpreadLeftPaneFits,
  READER_SPREAD_PANE_EXTRA_GUARD_PX,
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

  it("readerPageContentLimitPx matches paginator content limits", () => {
    expect(
      readerPageContentLimitPx({
        pageIndex: 0,
        startsWithChapterHeader: true,
        firstPageHeight: 520,
        pageHeight: 600,
      }),
    ).toBe(488);
    expect(
      readerPageContentLimitPx({
        pageIndex: 1,
        startsWithChapterHeader: true,
        firstPageHeight: 520,
        pageHeight: 600,
      }),
    ).toBe(472);
    expect(
      readerPageContentLimitPx({
        pageIndex: 1,
        startsWithChapterHeader: false,
        firstPageHeight: 520,
        pageHeight: 600,
      }),
    ).toBe(568);
  });

  it("readerColumnContentHeightPx reserves column safety slack", () => {
    expect(
      readerColumnContentHeightPx({
        columnLayoutActive: true,
        pageIndex: 0,
        startsWithChapterHeader: true,
        firstPageHeight: 520,
        pageHeight: 600,
      }),
    ).toBe(464);
    expect(
      readerColumnContentHeightPx({
        columnLayoutActive: true,
        pageIndex: 1,
        startsWithChapterHeader: true,
        firstPageHeight: 520,
        pageHeight: 600,
      }),
    ).toBe(448);
    expect(
      readerColumnContentHeightPx({
        columnLayoutActive: true,
        pageIndex: 4,
        startsWithChapterHeader: true,
        firstPageHeight: 520,
        pageHeight: 600,
      }),
    ).toBe(448);
    expect(
      readerColumnContentHeightPx({
        columnLayoutActive: true,
        pageIndex: 1,
        startsWithChapterHeader: false,
        firstPageHeight: 520,
        pageHeight: 600,
      }),
    ).toBe(544);
    expect(
      readerColumnContentHeightPx({
        columnLayoutActive: false,
        pageIndex: 0,
        startsWithChapterHeader: false,
        firstPageHeight: 520,
        pageHeight: 600,
      }),
    ).toBeUndefined();
  });

  it("readerColumnContentHeightPx deducts Holman chrome below columns", () => {
    expect(
      readerColumnContentHeightPx({
        columnLayoutActive: true,
        pageIndex: 1,
        startsWithChapterHeader: false,
        firstPageHeight: 520,
        pageHeight: 600,
        holmanChromeBelowColumnsPx: 72,
      }),
    ).toBe(472);
  });

  it("paginatorMeasureLimitPx reserves live column safety slack", () => {
    expect(paginatorMeasureLimitPx(568)).toBe(544);
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
    expect(col.style.height).toBe("96px");
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

  it("scriptureContentFitsPage rejects implicit overflow in four-column spread measurement", () => {
    applyScriptureColumnMeasureHtml(
      node,
      "<p class='scripture-paragraph'>alpha</p>",
      "scripture-columns-spread",
      120,
      { columnCount: 4, measureWidthPx: 640 },
    );
    const col = node.firstElementChild as HTMLElement;
    Object.defineProperty(col, "scrollWidth", { configurable: true, get: () => 900 });
    Object.defineProperty(col, "clientWidth", { configurable: true, get: () => 640 });
    Object.defineProperty(col, "scrollHeight", { configurable: true, get: () => 120 });

    expect(scriptureContentFitsPage(node, 120, "scripture-columns-spread")).toBe(false);
  });

  it("scriptureContentFitsPage rejects clipped block geometry in columns", () => {
    applyScriptureColumnMeasureHtml(
      node,
      "<p class='scripture-paragraph'>alpha</p><p class='scripture-paragraph'>beta</p>",
      "scripture-columns-2",
      80,
    );
    const col = node.firstElementChild as HTMLElement;
    Object.defineProperty(col, "scrollWidth", { configurable: true, get: () => 320 });
    Object.defineProperty(col, "clientWidth", { configurable: true, get: () => 320 });
    Object.defineProperty(col, "scrollHeight", { configurable: true, get: () => 80 });
    Object.defineProperty(col, "clientHeight", { configurable: true, get: () => 80 });
    Object.defineProperty(col, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 320, bottom: 80, width: 320, height: 80 }),
    });
    const paragraphs = col.querySelectorAll(".scripture-paragraph");
    paragraphs.forEach((p, i) => {
      Object.defineProperty(p, "getBoundingClientRect", {
        configurable: true,
        value: () =>
          i === 0
            ? { top: 0, left: 0, right: 320, bottom: 40, width: 320, height: 40 }
            : { top: 40, left: 0, right: 320, bottom: 92, width: 320, height: 52 },
      });
    });

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

  it("paginatorSpreadPaneLimitPx reserves extra spread pane guard", () => {
    expect(paginatorSpreadPaneLimitPx(568)).toBe(568 - READER_SPREAD_PANE_EXTRA_GUARD_PX);
    expect(paginatorSpreadPaneLimitPx(1)).toBe(1);
  });

  it("scriptureSpreadLeftPaneFits rejects blocks starting in column 3 of spread measure", () => {
    const columns = document.createElement("div");
    columns.className = "scripture-columns-spread";
    columns.style.width = "800px";
    document.body.appendChild(columns);

    const leftBlock = document.createElement("p");
    leftBlock.className = "scripture-paragraph";
    const rightBlock = document.createElement("p");
    rightBlock.className = "scripture-paragraph";
    columns.append(leftBlock, rightBlock);

    Object.defineProperty(columns, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 800, bottom: 400, width: 800, height: 400 }),
    });
    Object.defineProperty(leftBlock, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 380, bottom: 40, width: 380, height: 40 }),
    });
    Object.defineProperty(rightBlock, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 0, left: 410, right: 790, bottom: 40, width: 380, height: 40 }),
    });

    expect(scriptureSpreadLeftPaneFits(columns, 400)).toBe(false);
    columns.remove();
  });

  it("scriptureSpreadLeftPaneFits accepts blocks confined to the left page columns", () => {
    const columns = document.createElement("div");
    columns.className = "scripture-columns-spread";
    document.body.appendChild(columns);

    const block = document.createElement("p");
    block.className = "scripture-paragraph";
    columns.append(block);

    Object.defineProperty(columns, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 0, left: 0, right: 800, bottom: 400, width: 800, height: 400 }),
    });
    Object.defineProperty(block, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ top: 0, left: 20, right: 360, bottom: 40, width: 340, height: 40 }),
    });
    Object.defineProperty(columns, "scrollWidth", { configurable: true, get: () => 800 });
    Object.defineProperty(columns, "clientWidth", { configurable: true, get: () => 800 });
    Object.defineProperty(columns, "scrollHeight", { configurable: true, get: () => 400 });
    Object.defineProperty(columns, "clientHeight", { configurable: true, get: () => 400 });

    expect(scriptureSpreadLeftPaneFits(columns, 400)).toBe(true);
    columns.remove();
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
