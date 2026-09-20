# Visual library search and source identity

The visual library uses actual passage ranges for reference queries instead of matching chapter digits inside titles, dates or unrelated passages. For example, `John 1` does not select John 19, and `Acts 15` finds a map associated with Acts 1–28. A chapter-level association can still be returned as context for a verse query; it is never rewritten or presented as an independently reviewed exact-verse depiction.

Supported input includes full book names, existing reader abbreviations, `Jn`, spaced or unspaced numbered books, chapter ranges, same-chapter verse ranges, and cross-chapter verse ranges. Artist/title words can accompany one reference, such as `Rembrandt Matthew 19`. Invalid chapter bounds and descending ranges return no results. This is a single-reference search, not a multi-reference expression parser, and it does not validate verse counts against a selected translation.

Source identity includes the kind, source record, accession/object identifier and optional `source.viewId`. Use stable view identifiers such as `recto`, `verso`, or a manuscript folio when one object record supplies multiple images. Copies of the same view merge their passage associations; different sides are preserved. Only equivalent Wikimedia Commons file names normalize underscores and URL-encoded spaces. Unrelated URL paths are not rewritten as if they were Commons file names.

Regression coverage is in `src/lib/visualBible/queryHardening.test.ts`. Run the repository test suite and the Visual Bible library workflow; these checks complement the existing acquisition, browser and Scripture-reader regressions.
