

## iBooks vs Our Bible Reader — Gap Analysis

This is a research/comparison question, so here's what iBooks (Apple Books) offers that our current reader is missing, organized by category.

### Reading Experience

**Page turn animation**
- iBooks: True curling page-peel that follows your finger in real time, with shadow under the lifted page and a visible back-of-page during the turn.
- Ours: 3D `rotateY` flip in `PageFlip.tsx` that plays after release. No finger-following curl, no back-of-page shading, no partial-drag preview.

**Continuous scroll mode**
- iBooks: Toggle between paginated and one long scroll.
- Ours: Pagination only.

**Auto-pagination to screen**
- iBooks: Repaginates instantly on font/size/orientation change with no layout jump.
- Ours: `Paginator.tsx` re-measures, but there's a visible reflow flash and no "remember my place across font changes."

### Typography & Display

**Font picker** — iBooks ships 8+ typefaces (Athelas, Charter, Georgia, Iowan, Palatino, San Francisco, Seravek, Times New Roman). We have one scripture font.

**Font size slider** — granular 12-step control. Ours: none exposed in reader UI.

**Line spacing & margins** — three presets each. Ours: none.

**Themes** — White, Sepia, Gray, Night, with auto night-mode on schedule. Ours: single paper theme.

**Bold text toggle** and **publisher font override**. Ours: neither.

### Navigation

**Scrubber bar** at the bottom showing chapter name + "X pages left in chapter" as you drag. Ours: tabs + chapter picker, no scrubber.

**Table of contents drawer** with nested chapters/sections, current location highlighted. Ours: `BookTabs` + `ChapterPicker`, no unified TOC drawer.

**Bookmarks list view** — all bookmarks across the book in one panel with snippet preview. Ours: `BookmarkDialog` exists, no aggregated list view in-reader.

**Search across the whole book** with highlighted hits and jump-to. Ours: no search.

**Go back** — after tapping a footnote/cross-reference, a "Back to page X" pill appears. Ours: no cross-ref navigation history.

### Annotations

**Highlight colors palette** — 5 colors + underline, all visible at once on the page. Ours: `HighlightMenu` exists; verify color count and underline option.

**Notes margin indicator** — small icon in the margin where a note exists, tap to expand. Ours: `NoteDialog` exists, unclear if there's a visible margin marker.

**Notes & highlights tab** — a dedicated panel listing every annotation with the highlighted text + note, exportable. Ours: not present.

**Share highlight** as image card with book attribution. Ours: not present.

### Dictionary & Reference

**Tap-and-hold a word** → inline dictionary definition, Wikipedia, translate, search book. Ours: `VerseSheet` works at verse level, no per-word lookup.

**Footnotes & cross-references** as tappable popovers without leaving the page. Ours: not implemented (Bible cross-refs would be a major add).

### Library & Sync

**Library shelf** showing all books with covers, reading progress %, last-opened sort. Ours: single book (the Bible), so partially N/A — but no "recent books / recent chapters" surface.

**iCloud sync** of position, bookmarks, highlights, notes across devices. Ours: Supabase-backed, likely already syncing — confirm parity.

**Reading goals** — daily minutes, streaks, finished-books stats. Ours: not present.

### Audio

**Read Aloud** with sentence highlighting, speed control, voice picker, sleep timer. Ours: `sleep-tts` edge function exists for the Sleep page; no in-reader read-aloud with verse-level highlight tracking.

### Accessibility

**VoiceOver-optimized reading order**, **Dynamic Type** respect, **Spoken Content** integration. Ours: standard web a11y only, not audited.

### Polish Details

- Battery + clock overlay at the page bottom while reading.
- Brightness slider in the reader (separate from system).
- "X minutes left in chapter" estimate.
- Subtle paper-grain that shifts per page (we have static paper texture).
- Drop-cap on chapter openings.
- Page numbers that match physical book pagination.

---

### Suggested next step

If you want to close the biggest gaps, the highest-impact additions in priority order would be:

1. **Finger-following page curl** (replaces current flip) — single biggest "feels real" upgrade.
2. **Typography controls** (font, size, spacing, theme) — sepia/night mode especially.
3. **Full-text search** across the Bible.
4. **Notes & highlights panel** — aggregated list with jump-to.
5. **Read Aloud in-reader** with verse highlighting + sleep timer.
6. **Reading progress** — "X min left in chapter" + streaks.

Tell me which of these you want to build next and I'll come back with an implementation plan.

