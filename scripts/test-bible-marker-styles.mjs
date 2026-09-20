/** Actual browser cascade: shared Scripture markers, not jsdom layout guesses. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const css = readFileSync(new URL('../src/pages/reader/readerReliability.css', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
try {
  const page = await browser.newPage();
  await page.route('**/*', route => route.abort());
  for (const marker of ['scripture-footnote-mark', 'scripture-page-footnotes-marker']) {
    // Reset the document between cases to verify stylesheet replacement too.
    await page.setContent(`<!doctype html><html><head><style>
      sup { position: relative; top: -0.5em; vertical-align: baseline; }
      .${marker} { vertical-align: super; }
      ${css}
      </style></head><body>
      <div data-reading-area><sup data-case="measure" class="${marker}">14</sup><sup data-case="plain">14</sup></div>
      <div data-bible-reader><div data-reading-area><sup data-case="live" class="${marker}">14</sup></div></div>
      <sup data-case="outside" class="${marker}">14</sup><sup data-case="control">14</sup>
      </body></html>`);
    const results = await page.locator('[data-case]').evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node);
      return { name: node.dataset.case, position: style.position, top: style.top, verticalAlign: style.verticalAlign };
    }));
    for (const actual of results) {
      const corrected = actual.name === 'measure' || actual.name === 'live';
      assert.equal(actual.position, corrected ? 'static' : 'relative', `${marker}/${actual.name}: unintended position`);
      assert.equal(actual.verticalAlign, corrected || actual.name === 'outside' ? 'super' : 'baseline', `${marker}/${actual.name}: unintended alignment`);
      if (corrected) assert.equal(actual.top, 'auto', `${marker}/${actual.name}: marker raised twice`);
      else assert(parseFloat(actual.top) < 0, `${marker}/${actual.name}: unrelated superscript was changed`);
    }
    console.log(`PASS: ${marker}: live/measurement styles agree; unrelated superscripts unchanged`);
  }
  console.log('Actual Bible-provider requests: 0');
} finally {
  await browser.close();
}
