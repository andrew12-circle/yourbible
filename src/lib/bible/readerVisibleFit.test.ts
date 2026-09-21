import { afterEach, describe, expect, it, vi } from "vitest";
import { readerVisibleFit } from "./readerVisibleFit";
import { applyHolmanStudyMeasureHtml, scriptureContentFitsPage } from "./readerColumnMeasure";
import { smallestReaderPageBox } from "@/hooks/useReaderPageMeasurement";

const rect = (left: number, top: number, width: number, height: number) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) });
function sized(el: HTMLElement, width: number, height: number) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rect(0, 0, width, height));
  Object.defineProperties(el, { clientHeight: { configurable: true, value: height }, scrollHeight: { configurable: true, value: height }, clientWidth: { configurable: true, value: width }, scrollWidth: { configurable: true, value: width } });
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ""; });
describe("visible book-page fit", () => {
  it("uses the smaller face for both widths and heights", () => {
    expect(smallestReaderPageBox([{ w: 420, h: 600 }, { w: 440, h: 626 }])).toEqual({ w: 420, h: 600 });
    expect(smallestReaderPageBox([null, { w: 0, h: 600 }])).toBeNull();
  });
  it("rejects clipped single-column Scripture inside an otherwise fitting study stack", () => {
    const root = document.createElement("div"); document.body.append(root);
    applyHolmanStudyMeasureHtml(root, "<p>Entire chapter</p>", "", '<div class="scripture-page-footnotes">Note</div>', undefined, 400);
    const stack = root.firstElementChild as HTMLElement;
    const section = stack.firstElementChild as HTMLElement;
    sized(root, 400, 400); sized(stack, 400, 400); sized(section, 400, 280);
    Object.defineProperty(section, "scrollHeight", { configurable: true, value: 800 });
    expect(scriptureContentFitsPage(root, 400)).toBe(false);
  });
  it("preserves the sizing styles after testing a candidate", () => {
    const root = document.createElement("div"); document.body.append(root);
    applyHolmanStudyMeasureHtml(root, "<p>Words</p>", "", "", undefined, 400);
    const before = root.innerHTML;
    scriptureContentFitsPage(root, 400);
    expect(root.innerHTML).toBe(before);
  });
  it("accepts text fragments in both columns even when the paragraph union spans full height", () => {
    const root = document.createElement("div"); root.innerHTML = "<p>Continuation across columns</p>"; document.body.append(root);
    sized(root, 400, 400);
    const range = document.createRange();
    Object.defineProperty(range, "getClientRects", { value: () => [rect(5, 375, 150, 20), rect(220, 5, 150, 20)] });
    vi.spyOn(document, "createRange").mockReturnValue(range);
    expect(readerVisibleFit(root).fits).toBe(true);
  });
  it("detects a third overflow column and nested vertical clipping", () => {
    const root = document.createElement("div"); root.innerHTML = '<div style="overflow:hidden"><p>Hidden words</p></div>'; document.body.append(root);
    sized(root, 400, 400); sized(root.firstElementChild as HTMLElement, 400, 200);
    const range = document.createRange();
    Object.defineProperty(range, "getClientRects", { value: () => [rect(450, 10, 80, 20), rect(5, 198, 100, 20)] });
    vi.spyOn(document, "createRange").mockReturnValue(range);
    expect(readerVisibleFit(root).fits).toBe(false);
  });
  it("still measures intentionally hidden paginator text", () => {
    const host = document.createElement("div"); host.setAttribute("aria-hidden", "true"); host.style.visibility = "hidden";
    host.innerHTML = "<div><p>Measured words</p></div>"; document.body.append(host);
    const root = host.firstElementChild as HTMLElement; sized(root, 400, 400);
    const range = document.createRange();
    Object.defineProperty(range, "getClientRects", { value: () => [rect(5, 398, 100, 20)] });
    vi.spyOn(document, "createRange").mockReturnValue(range);
    expect(readerVisibleFit(root).fits).toBe(false);
  });
});

describe("short chapter-opening candidates", () => {
  it("uses the available page height, not the short candidate's natural height", () => {
    const root = document.createElement("div"); root.innerHTML = "<p>7 Opening verse</p>"; document.body.append(root);
    sized(root, 400, 26);
    const range = document.createRange();
    Object.defineProperty(range, "getClientRects", { value: () => [rect(0, 0, 30, 44), rect(36, 0, 200, 20)] });
    vi.spyOn(document, "createRange").mockReturnValue(range);
    expect(readerVisibleFit(root, 600).fits).toBe(true);
    expect(readerVisibleFit(root, 30).fits).toBe(false);
  });
  it("still rejects a numeral outside a genuinely clipped root", () => {
    const root = document.createElement("div"); root.style.overflowY = "hidden";
    root.innerHTML = "<p>Opening verse</p>"; document.body.append(root); sized(root, 400, 26);
    const range = document.createRange();
    Object.defineProperty(range, "getClientRects", { value: () => [rect(0, 0, 30, 44)] });
    vi.spyOn(document, "createRange").mockReturnValue(range);
    expect(readerVisibleFit(root, 600).fits).toBe(false);
  });
});
