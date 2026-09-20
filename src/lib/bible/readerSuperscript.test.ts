import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

const readerStyles = readFileSync(new URL("../../pages/reader/readerReliability.css", import.meta.url), "utf8");
const mounted: HTMLElement[] = [];
afterEach(() => { for (const node of mounted.splice(0)) node.remove(); });

describe("shared reader note-marker stylesheet contract", () => {
  it.each(["scripture-footnote-mark", "scripture-page-footnotes-marker"])(
    "%s corrects both measurement and live markers without changing unrelated superscripts",
    (className) => {
      // This unit test checks parsed declarations and selector scope. Actual
      // computed styles are checked in Chromium by test-bible-marker-styles.mjs;
      // the book-flow suite independently checks every visible line rectangle.
      const style = document.createElement("style");
      style.textContent = readerStyles;
      document.head.append(style);
      mounted.push(style);
      const rule = Array.from(style.sheet!.cssRules)
        .filter((candidate): candidate is CSSStyleRule => candidate.type === 1)
        .find((candidate) => candidate.selectorText === `[data-reading-area] .${className}`);
      expect(rule, "Shared scoped marker rule is missing").toBeDefined();
      expect(rule!.style.getPropertyValue("position")).toBe("static");
      expect(rule!.style.getPropertyValue("top")).toBe("auto");
      expect(rule!.style.getPropertyValue("vertical-align")).toBe("");

      const host = document.createElement("div");
      host.innerHTML = `
        <div data-reading-area><sup data-measure class="${className}">14</sup><sup data-plain>14</sup></div>
        <div data-bible-reader><div data-reading-area><sup data-live class="${className}">14</sup></div></div>
        <sup data-outside class="${className}">14</sup>
        <sup data-control>14</sup>`;
      document.body.append(host);
      mounted.push(host);
      expect(host.querySelector("[data-measure]")!.matches(rule!.selectorText)).toBe(true);
      expect(host.querySelector("[data-live]")!.matches(rule!.selectorText)).toBe(true);
      for (const selector of ["[data-plain]", "[data-outside]", "[data-control]"]) {
        expect(host.querySelector(selector)!.matches(rule!.selectorText)).toBe(false);
      }
    },
  );
});
