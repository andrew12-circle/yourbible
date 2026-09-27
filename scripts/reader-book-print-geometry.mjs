import assert from 'node:assert/strict';

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
