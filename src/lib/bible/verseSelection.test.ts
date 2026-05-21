// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  findVerseFromRangeBoundary,
  toolbarSelectionFromRange,
  versesFromRangeFallback,
} from "./verseSelection";

function buildJohn1Paragraph() {
  document.body.innerHTML = `
    <article data-reading-area>
      <p>
        <span data-verse="5">
          <button class="verse-num">5</button>
          <span data-verse-body="5">The light shines in the darkness,</span>
        </span>
        <span data-verse="6">
          <button class="verse-num">6</button>
          <span data-verse-body="6">and the darkness has not overcome it.</span>
        </span>
        <span data-verse="7">
          <button class="verse-num">7</button>
          <span data-verse-body="7">There was a man sent from God.</span>
        </span>
      </p>
    </article>
  `;
  const p = document.querySelector("p")!;
  const verseLengths = new Map<number, number>();
  for (const n of [5, 6, 7]) {
    const body = document.querySelector(`[data-verse-body="${n}"]`)!;
    verseLengths.set(n, body.textContent?.length ?? 0);
  }
  return { p, verseLengths };
}

function mockRangeGeometry(range: Range) {
  range.getClientRects = () =>
    [{ left: 10, top: 20, right: 200, bottom: 40, width: 190, height: 20 }] as unknown as DOMRectList;
  range.getBoundingClientRect = () =>
    ({ left: 10, top: 20, right: 200, bottom: 40, width: 190, height: 20 }) as DOMRect;
}

describe("verseSelection multi-verse paragraph", () => {
  it("resolves end boundary on trailing whitespace between verses", () => {
    const { p, verseLengths } = buildJohn1Paragraph();
    const range = document.createRange();
    const v5body = document.querySelector('[data-verse-body="5"]')!.firstChild!;
    const _afterV7 = p.childNodes[p.childNodes.length - 1];
    range.setStart(v5body, 4);
    range.setEnd(p, p.childNodes.length);
    mockRangeGeometry(range);

    expect(findVerseFromRangeBoundary(range, "end")).toBe(7);
    expect(versesFromRangeFallback(range, verseLengths)).toEqual([5, 6, 7]);
    expect(toolbarSelectionFromRange(range, verseLengths)?.verses).toEqual([
      5, 6, 7,
    ]);
  });

  it("shows toolbar payload for multi-verse body selection", () => {
    const { verseLengths } = buildJohn1Paragraph();
    const range = document.createRange();
    const v5 = document.querySelector('[data-verse-body="5"]')!.firstChild!;
    const v7 = document.querySelector('[data-verse-body="7"]')!.firstChild!;
    range.setStart(v5, 0);
    range.setEnd(v7, (v7.textContent ?? "").length);
    mockRangeGeometry(range);
    const payload = toolbarSelectionFromRange(range, verseLengths);
    expect(payload).not.toBeNull();
    expect(payload!.verses).toEqual([5, 6, 7]);
    expect(payload!.rect).toBeTruthy();
  });
});
