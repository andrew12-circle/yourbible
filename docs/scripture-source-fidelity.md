# Scripture source fidelity

The source HTML parser traverses nested body markup before dividing at verse markers.
It preserves centered and indented continuation paragraphs, text preceding the next
verse marker, and explicit line breaks as character-indexed source blocks. Speech
attributes from `wj` are authoritative. Narration is explicitly unmarked. The existing
quotation heuristic is only a best-effort fallback for legacy data lacking source
attributes; it is not a claim of publisher-certified red lettering for such data.

One normalized character stream backs styled parts, plain text, speech spans, selections,
fragment pagination and annotations. Notes and unresolved cross-references remain
apparatus rather than becoming Scripture. Only known provider bridge delimiters and
the known divine-name span boundary receive structural cleanup; arbitrary wording is
not guessed. Original HTML is inert, never inserted into the document as executable HTML.

The visible reader and hidden paginator share source-paragraph rendering. Red coloring
and highlights add no text width. Note controls use a zero-width anchor rather than
occupying an extra inline text cell. Overlapping highlights become disjoint intervals;
the last input row wins, and no character is concatenated twice.

## Cache and saved marks

New remote chapter records retain rawContent, parser revision and source blocks. Fresh
v11 records that already contain raw source are reparsed locally and keep their original
cachedAt value, edition, delivery mode and chapter identity. Invalid identities and expired
records are not migrated. Parsed-only records cannot recreate previously discarded words;
normal chapter loading may request that chapter when the user opens it. There is no bulk
provider download and no clearing of user storage, notes or highlights.

When repairing a chapter, its old plain text is retained as an annotation baseline. A
partial highlight is displayed only if its old coordinates still refer to the same text,
or its exact selected excerpt can be uniquely reanchored. Ambiguous partial marks are
kept in storage but withheld from painting the wrong Scripture; the verse exposes a
review explanation. Whole-verse marks remain. Newly saved range marks receive an
account- and mark-ID-scoped device excerpt anchor only after the database insert succeeds.
No release timestamp is treated as proof of which text an old browser tab selected.
Anchors are local to that device; an unanchored partial mark on another device may require
review. No database column or data migration is introduced by this release.

## Tests

sourceFidelity.test.tsx compares all 18 saved HTML chapters with an independent DOM
walk of body text and source speech markings. It does not use generated parser snapshots
as its accuracy oracle. SourceStructure covers continuation text and every internal
character cut in its fixture. SourceCache verifies local migration, age and identity
without network. AnnotationText verifies overlap behavior and excerpt anchoring.

The browser contract compares exact text and every visible glyph baseline/height for
plain, red, highlighted and annotated variants in 216 combinations per browser engine.
Collapsed zero-width whitespace can have browser-dependent range geometry; those
positions remain diagnostic while exact character content and all visible glyphs are
asserted. Actual ReaderPage tests also open saved source-marked Matthew and John through
intercepted provider responses, then verify exact page fragments and speech coloring.

Existing golden snapshots are regenerated offline only after independent source tests
pass. This validates saved test coverage, not the complete copyrighted edition or a
physical iPhone session. The separate mobile book-frame mockup is outside this change.
