import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

const readerStyles = readFileSync(new URL("../../pages/reader/readerReliability.css", import.meta.url), "utf8");
const added: HTMLElement[] = [];
afterEach(() => { for (const node of added.splice(0)) node.remove(); });

describe("reference markers in measured book pages", () => {
  it.each(["scripture-footnote-mark", "scripture-page-footnotes-marker"])(
    "%s is raised once, identically in hidden measurement and visible text",
    (className) => {
      const style = document.createElement("style");
      style.textContent = `sup { position: relative; top: -0.5em; vertical-align: baseline; }
        .${className} { vertical-align: super; }\n${readerStyles}`;
      document.head.append(style);
      added.push(style);
      for (const visible of [false, true]) {
        const host = document.createElement("div");
        if (visible) host.setAttribute("data-bible-reader", "");
        host.innerHTML = `<div data-reading-area><sup class="${className}">14</sup></div>`;
        document.body.append(host);
        added.push(host);
        const marker = host.querySelector("sup")!;
        const computed = getComputedStyle(marker);
        expect(computed.position).toBe("static");
        expect(computed.top).toBe("auto");
        expect(computed.verticalAlign).toBe("super");
      }
    },
  );
});
