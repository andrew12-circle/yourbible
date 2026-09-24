# Bible Earth explorer

## Use

Open `/bible/earth`, or reveal the Bible reader header and choose **Earth**. The reader dialog starts with its current book, chapter and recognized source translation. Search ancient/modern names, select verses, compare candidates, then open Google Earth. External maps open in a separate tab; closing the dialog does not replace or reflow Scripture.

Export these places creates KML for the active filter. Export entire atlas includes every imported ancient entry and all supplied location candidates. Unlocated entries have explanatory folders but no invented pins. Import the saved KML into Google Earth using New > Open local KML file, or New > Import file to project for a signed-in project. YourBible does not access or write to the user's Google account. Street View availability is not guaranteed.

## Source and scope

Pinned source: OpenBible.info `Bible-Geocoding-Data`, commit `7eb18a5ee62f27b9b93bd6689ea272d76dd23b8f` (2021-11-01). Source documentation: https://github.com/openbibleinfo/Bible-Geocoding-Data/blob/7eb18a5ee62f27b9b93bd6689ea272d76dd23b8f/readme.md

The static atlas normalizes all ancient.jsonl entries, disambiguated IDs, alias spellings, candidate resolutions, unresolved interpretations, source score, coordinate precision and verse associations. This is a 66-book Protestant-canon dataset, not a complete Ethiopian-canon database or an index of every implied event setting. Translation masks and alternate verse references are retained for ten translations, including CSB. All-translations mode displays the source's base versification. Do not equate source scores with independently established probabilities or precise event coordinates.

Data is CC BY 4.0; OpenStreetMap-derived data is ODbL 1.0. Attribution and the upstream license ship with the assets. No copyrighted Bible passage text or source image assets are republished. `source-atlas.kml` is an unmodified copy of the source's **partial** KML representation with richer geometry. YourBible exports are explicitly labeled point/reference-point exports; they do not fabricate travel routes or historical borders.

## Reproducible import

```
node scripts/bible-geography/import.mjs
node scripts/bible-geography/import.mjs --verify
node --test scripts/bible-geography/normalize.test.mjs
npm run lint
npm run test
npm run build
```

The import is pinned, validates coordinates/references, retains unknowns, records SHA256 hashes, and writes public/bible-geography. Assets are committed and served from the app's own deployment; normal production builds and reader use do not fetch upstream, call Bible providers, use AI or require a Google API key. The browser fetches and validates the atlas only when the explorer is opened, with in-session query caching and explicit retry UI.

Google Earth web coordinate search links have no promised stable API. They are isolated in `googleEarthHref`; documented Google Maps URLs and portable KML are fallback paths. Google documentation: https://developers.google.com/maps/documentation/urls/get-started and https://developers.google.com/maps/documentation/earth/import-data .

## Deliberately deferred

This release does not ingest a new Supabase geography database, assert that all scholarly identifications have been independently reviewed, reconstruct ancient buildings, create chronological event tours, auto-save Google Earth projects, or alter reader parsing/pagination. Database enrichment, event records, candidate-area rendering and researched routes can build on stable ancient IDs without blocking exploration.
