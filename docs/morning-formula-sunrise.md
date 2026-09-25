# Morning Formula: sunrise session design

Applies the approved warm sunrise direction to the existing `/living-hope/review` experience, not a replacement app or a new session model.

- A full-width scenic hero, serif heading, gold activity milestones and readable step menu.
- Warm-white music surface with existing saved cover art; local fallback when thumbnails fail. Real external Play worship links remain explicit. No fake scrubber, fake playing state or autoplay.
- Quick playlists select actual saved workbook music. The editor keeps URL validation, named saves and history; no invented playlists are installed.
- Arrive, Open, Adore and Respond are all retained, including their original instructions and approximate time allocations. Cards reflow from four/two columns to one column.
- Existing timers, next/back/save gates, journal persistence, prayer recordings and Scripture rendering remain unchanged. The hero uses the same focus target as the prior heading.
- Session styling is scoped; the builder and other sections are not restyled. Native viewport/keyboard handling, safe-area footer, dark mode, keyboard navigation and reduced-motion behavior remain supported.

## Artwork

`public/images/morning-sunrise.svg` is original bundled vector artwork created for this redesign: layered mountains, sunrise, a book and a cup. It adapts the approved scenic direction; it is not the raster mockup used as a webpage. It requires no remote image service, generation API, credentials or runtime AI credits. It is decorative, not Scripture or a claim about a historical place. The reminder is devotional copy, not attributed to Romans 12:1.

## Verification

`MorningSunrise.test.tsx` covers activity counts, step guards, menu escape/focus, phase preservation, actual playlist selection, named saves, unsafe links, empty music and thumbnail failures.

`node scripts/verify-morning-sunrise-ui.mjs` runs the real session presentation components in an isolated Vite/Playwright harness with fixture data. It checks desktop, mobile (390px), narrow (320px), dark mode, overflow, footer reachability, music save/switch and heading focus. It does not log in, call production services or prove end-to-end authenticated saving. Screenshots are uploaded by the Morning Formula UI workflow. Test harness files are removed after each run and are not production routes.
