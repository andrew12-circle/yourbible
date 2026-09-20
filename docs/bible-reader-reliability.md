# Bible reader reliability repair

The reader validates request identity before display, uses cache-first production
Scripture delivery with a 30-day maximum record age, separates development and
production cache keys, and does not use previous-query placeholder data. API.Bible
full-text distribution safeguards and production bundle stripping are unchanged.

Page positions are Scripture/artwork anchors, not stale visual indexes. Backward
navigation carries an explicit end-of-chapter intent. Only measured page boundaries
are displayed; exact-layout splits can be reused in the current reader session.
Both paginators measure poetry and page footnotes. Extremely tall content has a
scrollable recovery path instead of remaining clipped.

Scroll and paged modes share artwork ordering, including mid-chapter plates.
Nearby images are warmed from local application URLs; failures have a retry control.
A retained page snapshot is inert and cannot cross a user/edition/chapter identity.
The broad uppercase-I text rewrite was removed. Previously corrupted source exports
cannot be reconstructed by this change; a verified source import is still required
for any damaged original bundle.

Verification must include npm run lint, npm test, npm run build, TypeScript baseline
comparison, delayed chapter responses, offline cache misses/hits, artwork failures,
font/column reflow, backward chapter boundaries and large-font overflow. Synthetic
fixtures require no Bible provider credentials or real API.Bible calls. Physical
Safari/iPhone validation is separate from automated component tests.
