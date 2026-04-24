

## Hide the brown side-tap bars, add subtle arrows by the page number

Right now each page has a wide brown "tap zone" along its outer edge that advances/goes back. You want that gone and replaced with discreet ‹ / › arrows next to the page number at the bottom of the page.

### What changes

**Remove**
- The full-height brown tap strips on the left and right outer edges of the pages (the `renderTabs` thumb-index strips wired through `BookScene` → `Paginator`/`ReaderPage`).

**Add**
- Two small chevron buttons (`ChevronLeft` / `ChevronRight` from lucide-react) sitting inline beside the page number in the footer of each page, e.g.:

  ```text
  ‹  John · p. 14  ›
  ```

- Buttons are ghost-styled, ~20px, same muted ink color as the page number, with a subtle hover state. They call the same prev/next handlers the brown bars used to call.
- Disabled state (faded, no pointer) when on the first/last page.

### Behavior preserved
- Swipe gestures, keyboard arrows, and any header navigation keep working.
- Page-turn animation (PageFlip) still fires from these new buttons.

### Files touched
- `src/components/bible/BookScene.tsx` — drop the `renderTabs` slot rendering on outer edges (or stop passing it from the parent).
- `src/pages/reader/ReaderPage.tsx` (or wherever `renderTabs` is supplied) — remove the brown-bar renderer; pass `onPrev` / `onNext` / `canPrev` / `canNext` down to the page footer instead.
- `src/components/bible/Paginator.tsx` — render the page-number footer with the two chevron buttons inline.

### Out of scope
- No change to header, swipe, or page-curl animation work.
- No change to the gold page-edge stack along the top/bottom of the book — only the brown vertical click strips on the page sides go away.

