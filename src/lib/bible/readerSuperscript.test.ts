import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

const readerStyles = readFileSync(new URL("../../pages/reader/readerReliability.css", import.meta.url), "utf8");
const frames: HTMLIFrameElement[] = [];
afterEach(() => { for (const frame of frames.splice(0)) frame.remove(); });

describe("reference markers in measured book pages", () => {
  it.each(["scripture-footnote-mark", "scripture-page-footnotes-marker"])(
    "%s is raised once, identically in hidden measurement and visible text",
    (className) => {
      // Give each case its own stylesheet/cascade. Do not reuse a document's
      // computed-style cache after removing and replacing its stylesheets.
      const frame = document.createElement("iframe");
      document.body.append(frame);
      frames.push(frame);
      const doc = frame.contentDocument!;
      const view = frame.contentWindow!;
      doc.open();
      doc.write(`<!doctype html><html><head><style>
        sup { position: relative; top: -0.5em; vertical-align: baseline; }
        .${className} { vertical-align: super; }
        ${readerStyles}
      </style></head><body>
        <div data-reading-area><sup class="${className}">14</sup></div>
        <div data-bible-reader><div data-reading-area><sup class="${className}">14</sup></div></div>
        <sup data-default-marker>14</sup>
      </body></html>`);
      doc.close();

      const markers = doc.querySelectorAll(`sup.${className}`);
      expect(markers.length).toBe(2);
      for (const marker of markers) {
        const computed = view.getComputedStyle(marker);
        expect(computed.position).toBe("static");
        expect(computed.top).toBe("auto");
        expect(computed.verticalAlign).toBe("super");
      }
      // Confirm that the shared reader rules, not a missing base stylesheet,
      // supplied the correction. Unrelated superscripts retain their defaults.
      const control = view.getComputedStyle(doc.querySelector("[data-default-marker]")!);
      expect(control.position).toBe("relative");
      expect(control.verticalAlign).toBe("baseline");
    },
  );
});
