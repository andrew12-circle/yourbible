# Temporary regression transport; removed after the guarded application.
from pathlib import Path
Path('src/lib/bible/readerBookEnd.test.ts').write_text('''import { describe, expect, it } from "vitest";
import { readerPageEndsBook, readerStreamEndsBook } from "./readerBookEnd";
import { buildReaderStream, type ReaderChapterPassage } from "./readerStream";
import { sliceReaderVerse } from "./readerVerseFragments";
import { scriptureColumnWrapperStyle, applyScriptureColumnMeasureHtml, applyHolmanStudyMeasureHtml } from "./readerColumnMeasure";

const last = { number: 53, text: "They continued praising God." };
const chapter: ReaderChapterPassage = { bookAbbr: "Luk", bookName: "Luke", chapter: 24,
  verses: [{ number: 52, text: "They returned with great joy." }, last],
  paragraphStarts: [52], headings: [], poetryBlocks: [] };
const group = { bookAbbr: "Luk", chapter: 24, verses: chapter.verses };

describe("balanced final physical page", () => {
  it("balances only the end of a complete book, not each chapter or loading window", () => {
    expect(readerPageEndsBook([group], [chapter])).toBe(true);
    expect(readerPageEndsBook([{ ...group, chapter: 23 }], [{ ...chapter, chapter: 23 }])).toBe(false);
    expect(readerPageEndsBook([{ ...group, verses: [chapter.verses[0]] }], [chapter])).toBe(false);
    expect(readerPageEndsBook([group], [])).toBe(false);
    expect(readerPageEndsBook([], [chapter])).toBe(false);
  });
  it("does not balance a clipped first fragment of the final verse", () => {
    expect(readerPageEndsBook([{ ...group, verses: [sliceReaderVerse(last, 0, 10)] }], [chapter])).toBe(false);
    expect(readerPageEndsBook([{ ...group, verses: [sliceReaderVerse(last, 10, last.text.length)] }], [chapter])).toBe(true);
  });
  it("requires the same source text, rather than just matching a verse number", () => {
    expect(readerPageEndsBook([{ ...group, verses: [{ ...last, text: "Old incomplete words" }] }], [chapter])).toBe(false);
  });
  it("agrees in hidden stream measurement, including split verses", () => {
    const stream = buildReaderStream([chapter], { plateFocus: { bookAbbr: "NONE", chapter: 0 } });
    expect(readerStreamEndsBook(stream, [chapter])).toBe(true);
    expect(readerStreamEndsBook(stream.slice(0, -1), [chapter])).toBe(false);
    const end = stream.at(-1)!;
    if (end.kind !== "verse") throw new Error("Test requires a verse");
    expect(readerStreamEndsBook([{ ...end, verseRange: { start: 0, end: 10 } }], [chapter])).toBe(false);
    expect(readerStreamEndsBook([{ ...end, verseRange: { start: 10, end: last.text.length } }], [chapter])).toBe(true);
  });
  it("works for one-chapter books and the end of Revelation without an invented following book", () => {
    for (const [bookAbbr, number] of [["Jud", 1], ["Rev", 22]] as const) {
      const ch = { ...chapter, bookAbbr, chapter: number };
      expect(readerPageEndsBook([ch], [ch])).toBe(true);
    }
  });
  it("keeps the fixed page height and changes only the column distribution", () => {
    const normal = scriptureColumnWrapperStyle(600);
    const balanced = scriptureColumnWrapperStyle(600, true);
    expect(normal.columnFill).toBe("auto");
    expect(balanced).toEqual({ ...normal, columnFill: "balance", WebkitColumnFill: "balance" });
    expect(balanced.height).toBe(600);
    const node = document.createElement("div");
    applyScriptureColumnMeasureHtml(node, "<p>Source text</p>", "scripture-columns-2", 604, { balanceColumns: true });
    expect(node.firstElementChild?.getAttribute("style")).toContain("column-fill:balance");
    applyHolmanStudyMeasureHtml(node, "<p>Source text</p>", "", "", "scripture-columns-2", 604, { balanceColumns: true });
    expect(node.querySelector(".scripture-columns-2")?.getAttribute("style")).toContain("column-fill:balance");
  });
});
''')
Path('scripts/reader-book-print-geometry.mjs').write_text('''import assert from 'node:assert/strict';

/** Independently inspect actual visible glyph rectangles, not the paginator's
 * fit helper. Book titles are full-page spanners and final columns are balanced. */
export async function verifyBookPrintGeometry(page) {
  const rows = await page.evaluate(() => {
    const single = document.querySelector('[data-bible-reader]')?.hasAttribute('data-cropped-spread');
    const out = [];
    for (const pane of document.querySelectorAll('[data-reader-page-side]')) {
      if (single && pane.dataset.readerPageSide === 'right') continue;
      const article = pane.querySelector('[data-reading-area]');
      if (!article) continue;
      const columns = article.querySelector('.scripture-columns-2');
      const opener = article.querySelector('[data-reader-book-opening]');
      const terminal = columns?.hasAttribute('data-reader-terminal-columns');
      if (!opener && !terminal) continue;
      const box = columns?.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(article).lineHeight);
      const halves = [[], []];
      for (const body of article.querySelectorAll('[data-verse-body]')) {
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent.trim() || node.parentElement.closest('sup,figure,[hidden],.sr-only')) continue;
          const range = document.createRange(); range.selectNodeContents(node);
          for (const r of range.getClientRects()) {
            if (!r.width || !r.height) continue;
            halves[box && r.left >= box.left + box.width / 2 ? 1 : 0].push({ top:r.top, bottom:r.bottom });
          }
        }
      }
      const first = halves.map(rows => rows.length ? Math.min(...rows.map(r => r.top)) : null);
      const last = halves.map(rows => rows.length ? Math.max(...rows.map(r => r.bottom)) : null);
      const title = opener?.querySelector('h2');
      const heading = opener?.nextElementSibling?.classList.contains('scripture-heading') ? opener.nextElementSibling : null;
      out.push({ side:pane.dataset.readerPageSide, terminal:!!terminal, columnCount:columns ? getComputedStyle(columns).columnCount : '1',
        fill:columns ? getComputedStyle(columns).columnFill : null, first, last, lineHeight,
        opening:opener ? { book:opener.dataset.readerBookOpening, span:getComputedStyle(opener).columnSpan,
          titleAlign:getComputedStyle(title).textAlign, titleLeft:title.getBoundingClientRect().left,
          openerLeft:opener.getBoundingClientRect().left, width:opener.getBoundingClientRect().width,
          columnWidth:box?.width, extraCopy:!!opener.querySelector('.reader-book-opening-summary,.reader-book-opening-kicker'),
          sectionSpan:heading ? getComputedStyle(heading).columnSpan : null } : null });
    }
    return out;
  });
  for (const row of rows) {
    if (row.opening) {
      assert(['start','left'].includes(row.opening.titleAlign), 'Book name must be left aligned');
      assert(!row.opening.extraCopy, 'No decorative introduction inside reading columns');
      assert(Math.abs(row.opening.titleLeft-row.opening.openerLeft)<2,'Title left edge drifts');
      if (row.columnCount === '2') {
        assert.equal(row.opening.span,'all','Book title must span both columns');
        assert(row.opening.width > row.opening.columnWidth * .9,'Title reserved only one column');
        if (row.opening.sectionSpan) assert.equal(row.opening.sectionSpan,'all','Opening section heading must not lower only column one');
        if (row.first.every(y=>y!=null)) assert(Math.abs(row.first[0]-row.first[1])<=2,'Opening Scripture columns must begin level: '+JSON.stringify(row));
      }
    }
    if (row.terminal && row.columnCount === '2') {
      assert.equal(row.fill,'balance','Final book page must balance, ordinary pages must remain sequential');
      if (row.last.every(y=>y!=null)) assert(Math.abs(row.last[0]-row.last[1]) <= row.lineHeight*2+2,
        'Final column bottoms differ by more than two lines (widow/heading allowance): '+JSON.stringify(row));
    }
  }
  return rows;
}
''')
p=Path('scripts/test-bible-book-openings.mjs');s=p.read_text();s='import { verifyBookPrintGeometry } from "./reader-book-print-geometry.mjs";\n'+s
s=s.replace("const testBook=process.env.READER_TEST_BOOK||'Mat', testChapter=Number(process.env.READER_TEST_CHAPTER||28), endChapter=Number(process.env.READER_TEST_END_CHAPTER||9);","const testBook=process.env.READER_TEST_BOOK||'Mat', testChapter=Number(process.env.READER_TEST_CHAPTER||28);\nconst nextBook=process.env.READER_TEST_NEXT_BOOK||'Mrk';\nconst bookName=nextBook==='Jhn'?'John':'Mark';\nconst previousSlug=testBook==='Luk'?'luke':'matthew', nextSlug=nextBook==='Jhn'?'john':'mark';")
s=s.replace("const geometry=await inspect();const words=await inspectWords();","const geometry=await inspect();const words=await inspectWords();\n      const printGeometry=await verifyBookPrintGeometry(page);\n      steps.push({scenario:scenario.name,step,printGeometry});")
s=s.replace("books.includes('Mrk')","books.includes(nextBook)").replace("books.includes('Mat')","books.includes(testBook)")
s=s.replace("syntheticPassage('Mat',28)","syntheticPassage(testBook,testChapter)").replace('`Mat:28:${v.number}`','`${testBook}:${testChapter}:${v.number}`')
s=s.replace("'[data-reader-book-opening=\"Mrk\"]'","'[data-reader-book-opening=\"'+nextBook+'\"]'").replace("'[data-reader-book-opening=\"Mrk\"] h2'","'[data-reader-book-opening=\"'+nextBook+'\"] h2'")
s=s.replace(".textContent(),'Mark'",".textContent(),bookName").replace("'mark-opening-'+scenario.name", "nextSlug+'-opening-'+scenario.name").replace("'matthew-ending-'+scenario.name", "previousSlug+'-ending-'+scenario.name")
s=s.replace("w.id.includes(':Mat:')","w.id.includes(':'+testBook+':')").replace("w.id.includes(':Mrk:')","w.id.includes(':'+nextBook+':')").replace("==='Mrk'","===nextBook").replace("books,['Mat']","books,[testBook]").replace("r.book==='Mrk'","r.book===nextBook")
s=s.replace("await page.evaluate(()=>window.__navigate('/read/Mrk/1'))","await page.evaluate(b=>window.__navigate('/read/'+b+'/1'),nextBook)").replace("await page.evaluate(()=>window.__navigate('/read/Mrk/2'))","await page.evaluate(b=>window.__navigate('/read/'+b+'/2'),nextBook)")
s=s.replace("JSON.stringify({reports,requests,actualBibleProviderRequests:0","JSON.stringify({reports,requests,steps,actualBibleProviderRequests:0")
s=s.replace("    assert(reachedMark,'Could not reach Mark by turning pages');", "    assert(reachedMark,'Could not reach next book by turning pages');\n    if(scenario.columns==='double') assert(steps.some(s=>s.scenario===scenario.name && s.printGeometry.some(r=>r.terminal)), 'Ending-page balancing was not exercised');")
p.write_text(s)
Path('.github/workflows/bible-print-columns.yml').write_text('''name: Bible print columns
on:
  pull_request:
    paths:
      - 'src/**'
      - 'scripts/reader-book-print-geometry.mjs'
      - 'scripts/test-bible-book-openings.mjs'
      - '.github/workflows/bible-print-columns.yml'
  push:
    branches: [main]
    paths:
      - 'src/lib/bible/**'
      - 'src/components/bible/**'
      - 'src/pages/reader/**'
      - 'scripts/reader-book-print-geometry.mjs'
      - 'scripts/test-bible-book-openings.mjs'
      - '.github/workflows/bible-print-columns.yml'
permissions:
  contents: read
concurrency:
  group: print-columns-${{ github.ref }}
  cancel-in-progress: true
jobs:
  print:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, webkit]
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - name: Final-page and title contracts
        run: npx vitest run src/lib/bible/readerBookEnd.test.ts src/components/bible/ReaderBookOpening.test.tsx src/lib/bible/readerBookBoundary.test.ts src/lib/bible/readerColumnMeasure.test.ts
      - name: Browser tooling
        run: |
          npm install --prefix "$RUNNER_TEMP/print-tools" --no-save playwright
          "$RUNNER_TEMP/print-tools/node_modules/.bin/playwright" install --with-deps ${{ matrix.browser }}
      - name: Luke ending and John opening match the print layout
        env:
          VITE_SUPABASE_URL: https://example.supabase.co
          VITE_SUPABASE_PUBLISHABLE_KEY: test
          PLAYWRIGHT_MODULE: ${{ runner.temp }}/print-tools/node_modules/playwright/index.mjs
          READER_BROWSER: ${{ matrix.browser }}
          READER_TEST_BOOK: Luk
          READER_TEST_CHAPTER: '24'
          READER_TEST_NEXT_BOOK: Jhn
        run: node scripts/test-bible-book-openings.mjs
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: print-columns-${{ matrix.browser }}
          path: |
            ${{ runner.temp }}/book-opening-*.json
            ${{ runner.temp }}/book-opening-*.png
            ${{ runner.temp }}/john-opening-*.png
            ${{ runner.temp }}/luke-ending-*.png
''')
