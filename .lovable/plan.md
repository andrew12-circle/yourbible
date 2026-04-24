
The user wants the **top edge of each page to be subtly arched** (concave) instead of a perfectly straight horizontal line — high near the spine, dipping toward the outer edge — so the open spread looks like a real bound book that bows outward. Same for the bottom edge.

This is a CSS-only change in `src/components/bible/BookScene.tsx`:

1. Apply a `clipPath` polygon to each desktop page surface wrapper that:
   - Left page: top edge starts high at the right (spine, ~0px from top) and dips ~6–8px lower at the left (outer edge). Bottom mirrors: high at right (spine), low at left.
   - Right page: top edge starts high at the left (spine) and dips ~6–8px lower at the right (outer edge). Bottom mirrors.
   - Use enough intermediate vertices (~6–8 points along the top/bottom) for a smooth arc.
2. Add a faint shadow/highlight gradient along the new curved top and bottom of each page so the curl reads as depth rather than a clipped rectangle.
3. Mobile stays flat (single page, no spread arc).

Files touched:
- `src/components/bible/BookScene.tsx` — add `clipPath` + edge shading to each desktop page surface wrapper.

Out of scope: the existing perspective tilt, gilt edges, tabs, ribbons, cover, typography — all unchanged. No JS, no new components.
