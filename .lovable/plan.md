Make the open book read as a real, physical object sitting on top of the screen — like the iPad reference. Right now the page block is flush with the leather cover and only the side gilt edge is visible. We'll add the missing physical cues: visible page-block thickness on the **top and bottom** edges (not just the sides), a slight **cover overhang** around the page block, a **drop shadow under the book** to ground it, and **subtle perspective lift** so the top of the book feels slightly farther away than the bottom.

### What changes (all in `src/components/bible/BookScene.tsx`, CSS-only)

1. **Top + bottom page-block edges** — currently only the left/right gilt strips show. Add matching thin gilt strips along the **top** and **bottom** of the page-block (slightly thinner than the sides, ~6–8px desktop / 4–5px mobile) using the same warm-gold + fine-striation gradient as `stackBackground`, but rotated horizontally so the striations read as stacked sheet edges seen from above. This is the single biggest visual cue from the iPad reference.

2. **Cover overhang lip** — make the leather cover extend ~4–6px beyond the page block on all sides (already partially there via `p-[16px]`). Tighten the inner gold border so it sits *between* the cover edge and the page block, with a small dark gap line so the cover reads as a separate, thicker piece sitting under the pages.

3. **Inner cover shadow on pages** — add a soft inner shadow on all four sides of the page block where it meets the cover, so the pages look like they're nestled into the cover rather than painted onto it.

4. **Floor / grounding shadow** — add a large, soft, asymmetric drop shadow *under* the entire book (beneath the leather cover, outside it) so the book appears to float just above the dark background surface. Slightly offset down-and-right to match the existing top-down lighting.

5. **Subtle vertical perspective** — apply a very small `rotateX(1.2deg)` to the whole cover so the top edge recedes a hair, like a book sitting open in front of you (matches the iPad photo). Small enough not to distort text readability.

6. **Mobile** — apply the same top/bottom gilt edges and floor shadow (scaled down). Skip the perspective tilt on mobile since the single-page view already feels flat-correct.

### Out of scope
- Page curl / corner peel animations
- Changing the existing left/right gilt stacks, page-flip animation, ribbons, tabs, typography, highlighter look
- No new components, no JS logic changes, no dependencies

### Files touched
- `src/components/bible/BookScene.tsx` — add top/bottom edge strips, cover overhang refinements, inner+outer shadows, optional perspective tilt
