## Page-edge fan + 5 staggered hanging tabs per side

You want the open Bible to look more like the real thing:

1. The **golden gilt edge** belongs on the **left and right** sides of the open book (the fanned-page edges you can see when a Bible lies open) — not on the top and bottom.
2. The **book tabs** are physically clipped onto specific pages, so on any open spread you only ever see **5 tabs on each side**, each one **staggered vertically** (sitting at the page it's attached to), and you can scroll the strip to bring other tabs into view — but only ~5 are visible at once.

### What changes

**1. Gilt page edges → sides (not top/bottom)**

In `BookScene.tsx`:
- Delete the `PageStackEdge` strips currently rendered along the top and bottom.
- Move the gilt-edge treatment onto the **outer left and right page-stack columns** (the `stackBackground(...)` strips already there): give them a warm gold gradient with fine vertical striations so it reads like the bound edges of stacked pages seen from the side.
- Keep the existing inward shading toward the spine.
- Make these stacks a touch wider (~14–18px) so the gilt is clearly visible.

**2. Tabs hang OFF the gilt edge, 5 visible per side, staggered**

Rewrite `BookTabs.tsx`:
- Position tabs **outside the page block**, attached to the gilt strip, sticking outward ~16–22px past the page edge.
- The strip is a **vertical scroll viewport** sized to fit exactly **5 tab slots** (the 6th is always partially clipped at the bottom to hint scrolling).
- Each tab is **staggered horizontally by a small offset** (cycling through 4–5 step positions) so they look like real plastic clip-on tabs hooked at slightly different points on the gilt edge — never a perfect ladder.
- Each tab still has the cream/blush body, soft inner highlight, pencil border, vertical book name in muted ink — keep that look.
- Active book: scrolls itself into the centered slot smoothly (already works), gets a slightly larger size and a touch more elevation.
- Tap = navigate (unchanged).

**3. Side selection logic**

The open spread should show ~5 books on the left edge (those *before* the current book in the canon) and ~5 on the right edge (those *after*). Implementation:
- Pass the full ordered book list to `BookTabs`; each instance filters to "books that visually live on this side" centered around the current book.
- Left side: the 5 books leading up to and including the previous chapter's neighborhood; right side: the 5 following.
- Scrolling reveals more books in that direction.

### Files touched
- `src/components/bible/BookScene.tsx` — remove top/bottom gilt strips; widen and re-skin the side page stacks as gilt edges; give the tab slot more outward room.
- `src/components/bible/BookTabs.tsx` — rewrite as a 5-slot scrolling strip with horizontally staggered tabs that hang off the gilt edge.

### Out of scope
- Cover leather, ribbons, columns, red letters, header — all unchanged.
- No new data, no settings UI for tab counts.