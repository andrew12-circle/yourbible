

## Match the real-Bible look from the reference photo

Three concrete changes, all visual / layout — no business-logic changes.

### 1. Two-column text on each page

Right now each page renders one wide paragraph column. The reference shows **two narrow columns per page** (so a desktop spread = 4 columns total, mobile = 2 columns).

- In `ReaderPage.tsx`, render the verse `<article>` inside a `columns-2 gap-5` (Tailwind multi-column) container so verses flow column → column → next page naturally.
- Update the headless `Paginator` to also measure inside a 2-column layout at the same width so page splits stay accurate.
- Slightly tighten typography (verse-num superscript size, line height ~1.55) to match the dense Bible look.
- Keep highlights, notes, taps, swipe, page-flip animation untouched.

### 2. Realistic page-edge thumb tabs (replace the colored stack tabs)

The current `BookTabs` are bright candy-colored stripes that overlap the page-stack. The reference shows **soft cream/blush tabs cut into the page edge** with the book name printed on each, sized to the page block, evenly spaced top-to-bottom.

- Rewrite `BookTabs.tsx` so each tab:
  - Sits flush with the outer page edge, sticking out only ~14–18px past the page (like a real index tab).
  - Uses a warm cream/paper color with a subtle pink/peach tint that varies *very slightly* by section (no neon).
  - Has a soft inner highlight line, a thin pencil-style border, and a small drop shadow under it.
  - Renders the abbreviated book name in vertical small caps in a muted ink color.
  - Active book = slightly larger, slightly brighter, sits more proud.
- Keep the same scroll-into-view behavior and click-to-navigate handler.
- Tabs render on **both outer edges** as today (left edge for OT-leaning books, right edge for NT — current logic preserved).

### 3. Ribbons land like the photo

Small refinement only — already mostly right. Make the visible ribbon hang straight down the gutter (less tilt), with the angled tip just barely peeking out beneath the cover. No structural change beyond tuning the existing `Ribbons.tsx` numbers.

### Files touched

- `src/pages/reader/ReaderPage.tsx` — wrap verses in a `columns-2` container; pass the column-aware width to `Paginator`.
- `src/components/bible/Paginator.tsx` — measure inside a `columns-2` test node so splits match the rendered layout.
- `src/components/bible/BookTabs.tsx` — visual rewrite (cream tabs, vertical type, subtle elevation).
- `src/components/bible/Ribbons.tsx` — minor tuning of tilt/overshoot.

### Out of scope

- Cover leather, page-edge gilt stack, and overall book size stay as they are now.
- No changes to highlights, notes, bookmarks, AI sheet, or chapter navigation.
- Section coloring stays subtle; no per-section saturated colors.

