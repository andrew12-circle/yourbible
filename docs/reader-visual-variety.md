# Visual variety in the page-turning Bible

## Repair

The Visual Bible library added by PR #78 was available in a gallery and chapter drawer only. The reading stream continued to call the legacy plate selector, where lower numeric priorities consistently favored Tissot over Doré. This repair changes that actual selector, not merely the gallery UI.

`chapterContext.inlinePlatesForChapter` now uses `readerVisuals.selectReaderVisuals`. Source-checked paintings, artifact photographs, the modern lake photograph, the Ethiopian manuscript and the original Acts diagram can enter the same plate units used by paged and scrolling reading. Maps and architecture use explicit chapter anchors rather than blanket gospel-wide associations. First-party `assetPath` values are validated by `biblePlateAssets`; the existing preload and retry paths resolve those files too.

Nine additional paintings are recorded in `src/data/visualBible/readerExpansion.json`: Tintoretto, Corot, Bloemaert, Lorenzo Monaco, Botticelli, Caravaggio, El Greco, Velázquez and Tiepolo. Object pages, image links and public-domain labels were checked against the Met on 2026-09-23. Dates and attribution qualifiers are preserved. Both seed files pass the same acquisition and integrity checks. Existing catalogs and images are not removed.

## Selection rules

At most two art plates plus one context plate per chapter, each at a distinct declared verse slot. New paintings take precedence. When only the older artists cover a slot, the preference alternates deterministically by chapter rather than permanently preferring Tissot. Another artist is preferred for a second legacy plate where available. Context may replace a legacy opener, but no visual is moved to an invented verse to force it into the stream. Broad narrative overviews start once. All alternate images remain available in the chapter gallery.

The selection does not depend on time, random values or previous navigation. The Bible text, its API, measured pagination implementation and verse content are not rewritten. Context captions identify artistic interpretation, reconstruction, modern photography or historical comparison and retain image credits/license links.

This is not a claim that every chapter has many artists or that all 527 legacy attributions have been reviewed. Unillustrated chapters are not filled with unrelated imagery. The original proposal for hundreds of additional acquisitions remains a separate curation task.

## Regression checks

`readerVisuals.test.tsx` checks every canonical chapter for stable IDs, bounded counts, distinct slots and first-party assets, plus actual reader-stream placement and image retry. `test-reader-visual-variety.mjs` mounts the real ReaderPage and clicks Next page until the expected new artists and context images are visible. It checks twelve chapter scenarios and phone-width rendering with synthetic Scripture/account fixtures, not production account access.

Workflow: Reader visual variety. Do not label a commit deployed until its Vercel deployment is separately verified.
