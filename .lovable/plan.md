Make highlighted verses look like a *real* hand-applied highlighter — uneven, slightly translucent ink with imperfect edges, varied stroke widths, and a subtle texture so no two highlights look exactly alike.

Approach (CSS-only, no new dependencies):

1. **10 stroke "versions"** — pre-compose 10 distinct SVG filter recipes (or 10 sets of background-image gradients) that simulate slight variations in marker pressure: tilt, fade-out at one end, ragged top/bottom edges, pooling at one corner, double-pass overlap. Each is a class like `marker-v1`…`marker-v10`.
2. **Deterministic per-verse pick** — hash `(book + chapter + verse)` to pick one of the 10 variants so the same verse always looks the same on reload, but adjacent verses look different.
3. **Texture overlay** — add a fine SVG fractal-noise mask over the highlight color so the ink reads as porous marker pigment, not a flat rectangle. Slight rotation per variant (-1° to +1°) so strokes aren't perfectly horizontal.
4. **Color stays driven by user palette** — use the existing `--hl-color` CSS var (already wired in `renderVerse`). Variants only change the *shape/texture* of the ink, never the color.
5. **Multi-line behavior** — keep the current `box-decoration-break: clone` so each line of a multi-line highlight gets its own slightly imperfect stroke.

Files touched:
- `src/index.css` — replace the current single `.marker-hl` style with a base style + 10 `.marker-hl.v1`…`.v10` modifier rules. Add the SVG noise filter as a data-URI `mask` for porous texture.
- `src/pages/reader/ReaderPage.tsx` — in `renderVerse`, attach a deterministic `v{1-10}` modifier class to the `.marker-hl` span based on a tiny hash of `book+chapter+verse`.

Out of scope: highlighter palette/colors (already user-controlled), per-word highlighting, per-character variation (just per-verse stroke for now), animation when applied. SVG filter cost is one-time per page.