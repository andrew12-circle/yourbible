Add a font-size control so the user can scale the reading text up and down.

Approach:
1. Persist a `fontScale` (e.g. 0.85 → 1.5, default 1.0) in `localStorage` so the choice survives reloads. No backend change needed for now.
2. Expose two small `A−` / `A+` buttons in the `TopBar` (next to the bookmark icon) that step the scale by ±0.1, clamped, with a tooltip showing the current %. Add a "reset" affordance via clicking the current % readout (hidden behind the +/-).
3. Plumb the scale into the reader so it applies to verse text on the page:
   - Pass `fontScale` from `ReaderPage` into `PageSurface` and into the `Paginator` (so pagination splits stay correct at the new size).
   - Apply via inline `style={{ fontSize: \`\${fontScale}em\` }}` on the article element.
4. Re-paginate when the scale changes (already wired — `Paginator` recomputes on prop change; we just need to reset `splits` and `chapterPage` when scale changes).

Files touched:
- `src/components/bible/TopBar.tsx` — add A−/A+ controls, accept `fontScale` + `onFontScaleChange` props.
- `src/pages/reader/ReaderPage.tsx` — own the `fontScale` state with `localStorage` persistence; pass it to `TopBar`, `PageSurface`, and `Paginator`; reset splits when it changes.
- `src/components/bible/Paginator.tsx` — accept an optional `fontSizeStyle` so its hidden measurement node uses the same scale (otherwise pagination splits would be wrong).

Out of scope: per-book overrides, font-family change (already in profile), line-height control, mobile-only different defaults. Just text size, applied globally across the reader.