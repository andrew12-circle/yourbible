import assert from 'node:assert/strict';

/** Independent browser checks: no import of the production fit/numbering code. */
export async function verifyReaderPrintGeometry(page) {
  const result = await page.evaluate(() => {
    const errors = [], gutters = [];
    const roots = [...document.querySelectorAll('[data-reader-page-side] article[data-reading-area]')];
    for (const root of roots) {
      if (!root.querySelector('[data-verse-body]')) continue;
      const side = root.closest('[data-reader-page-side]').dataset.readerPageSide;
      if (!root.classList.contains('reader-print-text')) errors.push(`${side}: missing shared print typography`);
      for (const heading of root.querySelectorAll('.scripture-heading')) {
        const css = getComputedStyle(heading);
        if (!['start','left'].includes(css.textAlign) || css.fontStyle !== 'normal') errors.push(`${side}: heading is not upright and left aligned`);
      }
      for (const verse of root.querySelectorAll('[data-verse-id]')) {
        const number = verse.querySelector(':scope > .verse-num');
        if (!number) continue;
        const body = verse.querySelector('[data-verse-body]');
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
        let first = null;
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const index = node.textContent.search(/\S/);
          if (index < 0 || node.parentElement.closest('sup,figure')) continue;
          const range = document.createRange(); range.setStart(node,index); range.setEnd(node,index+1);
          first = range.getBoundingClientRect(); break;
        }
        if (!first) continue;
        const digit = (number.querySelector('.reader-verse-number-glyph') || number).getBoundingClientRect();
        const em = parseFloat(getComputedStyle(root).fontSize);
        // A verse number must not be left behind on the preceding line/column.
        if (digit.bottom < first.top - 1 || digit.top > first.bottom + 1) errors.push(`${verse.dataset.verseId}: detached number`);
        if (digit.right > first.left + 1) errors.push(`${verse.dataset.verseId}: number overlaps Scripture`);
        if (verse.classList.contains('scripture-verse-paragraph-start')) {
          if (first.left - digit.right < em * .1) errors.push(`${verse.dataset.verseId}: no number gutter`);
          if (digit.left < root.getBoundingClientRect().left - 1) errors.push(`${verse.dataset.verseId}: gutter clipped`);
          gutters.push({side, id:verse.dataset.verseId, numberRight:digit.right, textLeft:first.left});
        }
      }
    }
    return {errors,gutters};
  });
  assert.deepEqual(result.errors, [], result.errors.join('\n'));
  assert(result.gutters.length > 0, 'No hanging verse numbers were exercised');
  return result;
}
