## Red-letter words of Jesus, slightly lifted off the page

A real "red-letter edition" — Jesus' direct speech rendered in a warm crimson with a subtle raised-from-the-page effect.

### What changes

**1. Detect Jesus' spoken text per verse**
- Add a small helper `splitJesusSpeech(verse)` in `src/lib/bible/redLetter.ts` that returns an array of `{ text, isJesus }` segments.
- Heuristic: when a verse appears in Matthew/Mark/Luke/John (Mt, Mk, Lk, Jhn) AND is in a **known red-letter range** for that chapter, the text inside paired quotation marks (`"…"` / `"…"` / `'…'`) is treated as Jesus.
- Maintain a curated, conservative range list (e.g. Mt 5–7 Sermon on the Mount, Mt 11:25–30, Mt 13 parables, Jhn 3:3–21, Jhn 6:26–65, Jhn 14–17, Lk 15 parables, etc.). Verses outside the list never get red letters even if they have quotes — avoids painting Pharisees/disciples red.

**2. Render red segments with a "lifted" feel**
- New CSS class `.red-letter` in `src/index.css`:
  - `color: hsl(0 75% 38%)` (warm Bible-red, not neon)
  - `font-weight: 500` (a touch heavier so it lifts visually)
  - `text-shadow` stack: `0 1px 0 hsl(0 0% 100% / 0.7), 0 2px 1px hsl(0 65% 25% / 0.35), 0 0 0.5px hsl(0 75% 30% / 0.4)` — a tiny embossed shadow that reads as "raised off the page."
  - Tight letter-spacing tweak so it stays compact in the 2-column layout.
- Works in light/dark themes.

**3. Wire it into the verse renderer**
- In `ReaderPage.tsx`, replace the plain `{v.text}` (and the highlighted variant) with a small inline component that maps the segments → `<span class="red-letter">…</span>` for Jesus segments, plain text otherwise.
- Apply inside the existing highlight wrapper too, so red letters show through highlights.
- Update `Paginator.tsx`'s headless HTML so its measurements match (same red spans, same weight) — keeps page splits accurate.

### Files touched
- `src/lib/bible/redLetter.ts` (new) — range table + segmentation helper.
- `src/index.css` — `.red-letter` class.
- `src/pages/reader/ReaderPage.tsx` — use the segmenter inside `renderVerse`.
- `src/components/bible/Paginator.tsx` — use the same segmenter when building the measurement HTML.

### Out of scope
- No translation-specific quotation parsing beyond the standard `" " " ' '` set.
- No per-character animation, no tooltip explaining red letters — just the look.
- Cover, tabs, columns, ribbons all stay as they are.