// One-time, idempotent integration. Fail rather than overwrite an unfamiliar reader.
import { readFile, writeFile } from 'node:fs/promises';
async function patch(path, marker, changes) {
  const url = new URL(`../../${path}`, import.meta.url);
  let text = await readFile(url, 'utf8');
  if (text.includes(marker)) return;
  for (const [before, after] of changes) {
    if (text.split(before).length !== 2) throw new Error(`Expected exactly one integration anchor in ${path}: ${before}`);
    text = text.replace(before, after);
  }
  await writeFile(url, text);
}
await patch('src/components/bible/TopBar.tsx', 'BibleEarthButton', [
  ['import { Link } from "react-router-dom";', 'import { Link } from "react-router-dom";\nimport { BibleEarthButton } from "@/components/bible/earth/BibleEarthButton";'],
  ['{!focusMode ? <ReaderToolbarActions {...toolbarProps} /> : null}', '{!focusMode ? (<>\n                <BibleEarthButton book={currentBook.abbr} chapter={currentChapter} translation={bibles.find((entry) => entry.id === bibleId)?.abbreviation} />\n                <ReaderToolbarActions {...toolbarProps} />\n              </>) : null}'],
]);
await patch('src/App.tsx', 'BibleEarthPage', [
  ['const LifeGuidePage = lazy(() => import("./pages/bible/LifeGuidePage"));', 'const LifeGuidePage = lazy(() => import("./pages/bible/LifeGuidePage"));\nconst BibleEarthPage = lazy(() => import("./pages/bible/BibleEarthPage"));'],
  ['<Route path="/bible/life-guide" element={<LifeGuidePage />} />', '<Route path="/bible/life-guide" element={<LifeGuidePage />} />\n                  <Route path="/bible/earth" element={<BibleEarthPage />} />'],
]);
console.log('Bible Earth reader button and /bible/earth route integrated.');
