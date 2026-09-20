# Visual Bible library

## Shipped scope

The existing Artwork back-matter route and chapter media sheet now open one searchable, paged visual library. Categories: paintings/prints, artifacts, maps, places, architecture, manuscripts and timelines. Existing inline plates, scripture fetching, chapter anchors and pagination are unchanged.

The first expansion adds **12 records**: four Met paintings/prints (Gentileschi, Rembrandt, Dürer and Giotto); five Met objects; one Ethiopian manuscript leaf from the Walters; one CC BY photograph of the Sea of Galilee; and an original Acts overview diagram. The 527 existing plate records and eight maps are adapted without modifying their authoritative catalogs or bundled assets. Two existing map records are classified as architecture. Duplicate source identities are merged in the gallery, retaining their chapter associations; identical titles alone are never deduplicated.

This is the expandable library and first reviewed acquisition batch, NOT the previously proposed 385-item expansion or a completed review of the legacy collection. Legacy rights/attributions/mappings remain visibly marked for review. Museum metadata and reuse designations were checked on 2026-09-20; the Scripture associations and captions are editorial, not museum endorsements. Object dates retain uncertainty. Artifacts are comparisons, not claims that a biblical figure owned the exact object. Manuscripts and modern landscape photos are dated and clearly distinguished from first-century evidence.

## Delivery and stability

- Only 24 cards mount per page; thumbnails are lazy and reserve a fixed image area.
- Detail derivatives load only after opening a focus-managed dialog. Fit/zoom preserves the full composition.
- Closed chapter sheets do not mount the gallery. Changing chapters resets scope and closes the existing sheet through the reader hook.
- The Vite build/dev server runs `scripts/acquire-visual-bible.mjs`. New client image URLs are always same-origin `/visual-bible/v1/...`; there is no museum search or Bible API call during gallery rendering.
- Source rasters are downloaded from explicit HTTPS hosts, with redirects checked, time/byte/pixel limits, retries, MIME/decode validation, and an offline-verifiable SHA-256 manifest. Unsupported or missing rights stop acquisition. Source images are retained in `.visual-bible-cache/`, outside the public build.
- Thumbnail maximum: 640 px; detail maximum: 2400 px, preserving aspect ratio and never enlarging the source. Source resolution may be lower. No crops, generative replacement, or AI restoration.
- A fresh build requires access to the pinned image sources. It fails rather than deploying unresolved image placeholders. Existing verified local derivatives are reused. A provider outage cannot change an already deployed gallery. Dev acquisition errors return a visible retriable image error rather than affecting Bible text.
- New gallery assets are excluded from PWA precaching; a same-origin CacheFirst image cache is capped at 64 entries/30 days. Existing Bible reader precaching is retained. Offline support is for previously viewed/cached images, not a guarantee that the whole library is downloaded.

## Add or revise a visual

1. Review the primary source's object attribution, image identity and exact image reuse permission. Check the image, not just the age of the object. Retain credit/rights links and note derivative changes.
2. Add to `src/data/visualBible/seed.json`: stable id, positive revision, metadata, source record and image URL, license, check date, alt text, interpretive caution, tags and one or more passage associations. Use chapter links unless an exact verse is defensible. Distinguish depiction, context, geography, reconstruction, manuscript tradition and narrative overview.
3. Do not mark AI suggestions or unreviewed discoveries as source-checked. Do not place unknown-rights assets in the publication seed. Add new image hosts only after a source/security review.
4. Increment the revision when changing image content so cached readers receive a new URL. Larger future catalogs should move the same versioned assets to first-party object storage, not introduce runtime museum calls.
5. Run `node scripts/acquire-visual-bible.mjs`, then `node scripts/acquire-visual-bible.mjs --verify`, `npm run lint`, `npm test`, and `npm run build`. Source/caption changes invalidate the local provenance manifest.

The acquisition pipeline enforces metadata/rights policy shape and file integrity; it does not perform independent historical or legal review. Full source originals require preserving the acquisition cache outside ephemeral CI. The original YourBible diagram is not automatically donated to the public domain.

## Acceptance checks

Open `/read/study/artwork`. Search an artist and a reference, switch categories, page forward, clear filters, open an image, zoom, close and verify focus returns. Open Luke 2 chapter visuals: the Augustus artifact appears with a comparison caveat. Open John 19: the medieval Ethiopian manuscript appears with the correct recto/burial association. Open Acts: maps and the original narrative overview appear. Test phone-width layout, keyboard controls, broken-image retry and offline previously viewed images. Turn Bible pages before and after using the drawer; inline image order and scripture position must remain unchanged.
