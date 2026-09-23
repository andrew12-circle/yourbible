# Visual variety in the page-turning Bible

## Root causes and repair

PR #78 made a Visual Bible gallery and chapter drawer, but the page-turning reader continued to use only the legacy illustration selector. Lower numeric priorities permanently favored Tissot over Dore at shared slots. The deployed Vite configuration later disabled acquisition on Vercel without bundling its generated images, so an otherwise successful build could omit the new image files.

`chapterContext.inlinePlatesForChapter` now uses `readerVisuals.selectReaderVisuals`. The acquired paintings, artifacts, modern lake photo, Ethiopian manuscript and Acts diagram enter real page and scroll plate units. Maps and architecture use explicit chapter anchors, not gospel-wide automatic insertion. `biblePlateAssets` validates their first-party paths and the existing preloader/retry renderer uses them.

## Collection and selection

Nine additional paintings are recorded in `src/data/visualBible/readerExpansion.json`: Tintoretto, Corot, Bloemaert, Lorenzo Monaco, Botticelli, Caravaggio, El Greco, Velazquez and Tiepolo. Museum attribution qualifiers and dates are retained. Both seed files use the same acquisition and integrity checks. Existing raw catalogs and images remain intact.

At most two art plates and one context plate per chapter, at distinct declared verse positions. New paintings take precedence. When the old artists share a slot, their preference alternates deterministically by chapter. The next existing narrative scene is retained rather than skipping ahead solely for another artist. Context can replace a legacy opener, never a newly curated painting. No visual is assigned an invented verse. Broad overviews start once. All alternatives remain in the gallery.

Selections have no random, clock or navigation-history dependency. Bible text, APIs and the measured pagination implementation are unchanged. Context captions retain credits, license links and distinctions between interpretation, reconstruction, modern photography and historical comparison.

## Release safety

The approved seed bundle is now committed under `public/visual-bible/v1`. Vercel verifies the committed hashes offline before building, then verifies the actual dist copies; it does not download museum images. A missing or stale file blocks the build. Visual and legacy plate paths are excluded from the SPA fallback so a missing image cannot receive a misleading HTML success response. A new image cache name avoids reusing previously cached fallback responses.

The one-off image acquisition workflow was removed after writing the approved images to this repair branch. The permanent regression workflow has read-only repository permission and cannot commit code.

To add source-reviewed records: run `node scripts/acquire-visual-bible.mjs` outside Vercel, verify it with `--verify`, and commit the catalog, generated derivatives and manifest together. Generated WebPs may need `git add -f` because of the existing ignore rule. Full-resolution source originals stay outside the public build. Larger future collections should use versioned first-party object storage.

## Verification

`readerVisuals.test.tsx` checks every canonical chapter for stable selection, bounds, first-party paths and distinct slots, and tests actual stream placement and image retry. The existing Genesis 4 mid-verse regression remains. The Joshua 13 fixture still checks verse 14 to verse 15 continuity, but finds its split by verse identity rather than assuming a map-free stream.

`visualRelease.test.ts` rejects missing images and HTML masquerading as image files. `test-reader-visual-variety.mjs` mounts the real ReaderPage, clicks Next page through twelve chapter scenarios and checks phone width. It uses synthetic account/Scripture fixtures, not a production user account. The build workflow explicitly sets VERCEL=1 to test the release path.

This is a reading-integration repair plus nine paintings, not the complete proposed hundreds-of-assets acquisition project or a complete review of the 527 legacy records. Some chapters still have limited artist coverage. No live-deployment claim is valid until the Vercel deployment and served image files are separately verified.
