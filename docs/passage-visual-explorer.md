# Same-page passage visual explorer

The Explore this passage control on an actual ScripturePlate opens a lazy, bounded overlay within that same figure. Previous/Next visual and a type-grouped select change the visual only. The underlying reader unit, route, verse anchor, pagination and featured-image choice are not rewritten. Closing restores focus and the original visual. Image source, creator, credit and license always follow the selected asset. The current image remains first; available categories are derived from the approved catalogue, not invented placeholders.

The triumphal-entry geography pilot covers Matthew 21:1–11, Mark 11:1–11, Luke 19:28–44 and John 12:12–19. Exact artwork associations are constrained to the scene; wider map/object associations remain contextual and retain their cautions. Other chapters have the image switcher but do not receive invented geographic locations. Additional geography requires explicit source-backed scene records.

## Google and offline behavior

The in-page satellite surface uses the supported Maps JavaScript API, not an iframe pretending to be Google Earth. The optional in-page 3D surface uses Google's Map3DElement. Google Earth itself opens through an explicitly labeled external link, leaving the Bible tab in place. No Google requests start until a reader selects geography and presses Load Google map. No map tiles, panoramas or Google 3D data are downloaded into the offline image library. Google and data-provider attribution must stay visible.

Use the existing VITE_GOOGLE_MAPS_API_KEY, restricted to your own web origins and the required Maps APIs. The 3D button additionally requires VITE_BIBLE_GOOGLE_3D_ENABLED=true after the appropriate API and billing are configured. This code does not enable a service, change billing, or grant additional key permissions. No-key, offline, load-failure and permission-failure states must remain usable. Automated tests use mocked Google components and do not certify credentials, billing, regional 3D coverage or physical devices.

The site overlay is a small set of representative modern location points, with source URLs and precision labels. It is NOT an ancient city reconstruction, exact procession route or AD 30 satellite layer. The source's historical Jerusalem overlays are linked rather than copied: https://www.openbible.info/geo/overlays/ explicitly states that image permissions differ and some are used by that site with permission. Additional period-specific raster overlays need a reviewed license, attribution, georeferencing, represented period, date of creation and uncertainty notes before publishing.

Sources checked 2026-09-24:
- https://developers.google.com/maps/documentation/javascript/3d/get-started
- https://developers.google.com/maps/documentation/javascript/3d/marker-overview
- https://support.google.com/earth/answer/148094?hl=en
- https://maps.google.com/intl/en_all/help/terms_maps-earth/
- https://www.openbible.info/geo/ and individual URLs in geography.ts
- https://www.copyright.gov/help/faq/faq-fairuse.html

## Image permission rule

Attribution is not authorization. Existing acquisition gates accept documented public-domain/CC0 or supported CC BY/CC BY-SA images, preserve credit and exact terms, and fail closed for unsupported rights. Copyrighted but viewable material may be linked at the original source; do not silently mirror it, scrape an embed into an offline file, remove watermarks, or blanket-label museum photography public domain. Cached licensed images are available only when that device has actually cached them; the entire collection is not automatically downloaded.

## Acceptance

With synthetic Scripture and test authentication, navigate actual ReaderPage to Matthew 21, turn to its visual page, open the explorer, select an image then a map and geography. Verify the reader page text/route/anchor does not change. Test keyboard focus, Escape, next/previous bounds, retry, credits, phone width, and no Google requests before explicit load. Changing chapters resets the explorer. Repeat core reader fit/continuation tests; known oversized-verse resize issue #91 must not be reported as fixed by this feature.
