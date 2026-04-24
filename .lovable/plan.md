Add a subtle 3D arc to the open spread so the pages curve inward toward the spine like a real bound book — not flat. Two changes in `BookScene.tsx`:

1. **Page-curl gradients (cheap, no transforms)**
   - Strengthen the existing `PageCurve` strips at the spine side of each page so the inner edge has a soft shadow falling away from the spine (suggesting the page bowing into the gutter).
   - Add a matching outer-edge highlight gradient on each page so the outer side reads as the part of the page closest to the eye (lifted), and the inner side as the part dipping into the spine.

2. **True perspective tilt (the "arc")**
   - Wrap each page surface in a perspective container (`perspective: ~1800px` on the page-block).
   - Apply a small `rotateY` to each page — left page tilts ~+4°, right page tilts ~-4° — pivoting from the spine (`transformOrigin: right center` for the left page, `left center` for the right page).
   - Add `backface-visibility: hidden` and a faint inner shadow at the gutter so the curve reads cleanly.
   - Mobile: skip the tilt (single page, no spread to arc).

Files touched:
- `src/components/bible/BookScene.tsx` — perspective wrapper, rotateY on each page, stronger gutter shading.

Out of scope: ribbons, tabs, gilt edges, cover, typography — all unchanged. No animation on page turn beyond what's already there.