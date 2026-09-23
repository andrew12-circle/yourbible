import assert from 'node:assert/strict';

/** Inspect the real reader, independently of its running-head helper. */
export async function verifyReaderChromeGeometry(page) {
  const errors = await page.evaluate(() => {
    const errors = [];
    const root = document.querySelector('[data-bible-reader]');
    if (!root || root.getAttribute('aria-busy') === 'true') return errors;
    const single = root.hasAttribute('data-cropped-spread');
    if (!single && root.querySelector('[data-reader-chapter-bar]')) errors.push('Spread still has a floating bottom bar');
    for (const surface of root.querySelectorAll('[data-reader-page-side]')) {
      if (single && surface.dataset.readerPageSide === 'right') continue;
      const rect = surface.getBoundingClientRect();
      const header = surface.querySelector('[data-reader-running-head]');
      if (!header || !rect.width || !rect.height) continue;
      const label = header.querySelector('[data-reader-running-reference]');
      const number = header.querySelector('[data-reader-running-page-number]');
      if (number) {
        const n = number.getBoundingClientRect();
        if (Math.abs((n.left+n.right)/2 - (rect.left+rect.right)/2) > 2) errors.push('Page number is not centered on the physical page');
        if (label) {
          const l = label.getBoundingClientRect();
          if (l.left < n.right && l.right > n.left) errors.push('Chapter label overlaps the top number');
        }
      }
      const verses = [...surface.querySelectorAll('article[data-reading-area] [data-verse-id]')];
      if (verses.length && label) {
        const [firstBook, firstChapter] = verses[0].dataset.verseId.split(':').slice(-3);
        const [lastBook, lastChapter] = verses.at(-1).dataset.verseId.split(':').slice(-3);
        const text = label.textContent.trim();
        if (firstBook === lastBook) {
          const range = firstChapter === lastChapter ? firstChapter : `${firstChapter}–${lastChapter}`;
          if (!text.endsWith(' '+range)) errors.push(`Header "${text}" does not describe visible chapters ${range}`);
        }
      }
      const footer = surface.querySelector('[data-page-footer]');
      if (!footer) continue;
      if (footer.textContent.trim()) errors.push('Footer still contains labels or page numbers');
      const buttons = [...footer.querySelectorAll('button')];
      if (!single) {
        if (footer.querySelector('svg')) errors.push('Spread footer still shows arrows');
        if (buttons.length !== 1) errors.push('Missing spread tap zone');
        const expected = surface.dataset.readerPageSide === 'left' ? 'Previous page' : 'Next page';
        if (buttons[0]?.getAttribute('aria-label') !== expected) errors.push('Wrong spread tap direction');
      } else if (footer.querySelectorAll('svg').length !== 2) errors.push('Single page is missing its two corner arrows');
    }
    return errors;
  });
  assert.deepEqual(errors, [], errors.join('\n'));
}
