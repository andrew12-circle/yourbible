/** Wait for a completed, stable measured layout, not an arbitrary sleep.
 * This never tests for fit: permanent clipping still fails the independent
 * geometry assertions after the layout has settled.
 */
export async function waitForReaderLayout(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    const started = performance.now();
    let previous = "", stableSince = started;
    const check = () => {
      const now = performance.now();
      if (now - started > 30000) {
        reject(new Error("Reader did not finish a stable measured layout"));
        return;
      }
      const root = document.querySelector('[data-bible-reader]');
      const position = window.__readerPositionHistory?.at(-1);
      const articles = [...document.querySelectorAll('[data-reader-page-side] article[data-reading-area]')];
      const ready = root?.getAttribute('aria-busy') === 'false'
        && !root.querySelector('[aria-busy="true"]')
        && position?.ready !== false && document.fonts.status === 'loaded'
        && articles.some(node => node.querySelector('[data-verse-id], [data-reader-plate]'));
      const snapshot = ready ? JSON.stringify([window.__path, position, articles.map(node => {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return [rect.x, rect.y, rect.width, rect.height, style.fontSize, style.lineHeight,
          [...node.querySelectorAll('[data-verse-id], [data-reader-plate]')].map(item =>
            [item.dataset.verseId, item.dataset.verseStart, item.dataset.verseEnd, item.dataset.readerPlate])];
      })]) : "";
      if (snapshot && snapshot === previous) {
        if (now - stableSince >= 350) { resolve(); return; }
      } else stableSince = now;
      previous = snapshot;
      setTimeout(check, 50);
    };
    check();
  }));
}
