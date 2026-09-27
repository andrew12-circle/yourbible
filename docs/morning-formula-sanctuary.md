# Morning Formula complete visual redesign

Extends the approved sunrise direction beyond the worship screen to the landing page, all session states, the letter, and every foundation editor.

## Scope

- Full-width scenic landing, a clear begin/resume/existing-journal action, separate session completion and foundation readiness, visible supporting tools, and the complete existing foundation directory.
- Shared hero, gold actions, readable content surfaces and responsive spacing across guided and structured sessions, including intro, worship, gratitude, Scripture, prayer, identity, vision, scenes, surrender, covering, assignments, goals, metrics and completion.
- Desktop gratitude panels with one active continuous dictation control; mobile switches between the same preserved lists.
- Scripture and reflection columns retain the actual verified chapter renderer and physical-Bible preference. The backdrop is not a source of Scripture text.
- Prayer reading, editing and existing voice recordings; six real assignment fields and the current rehearsal-to-assignment behavior.
- Foundation section navigation and a single scroll surface, including all 12 workbook sections and the future letter.

## Data boundaries

The ritual definition, MorningReviewPage save gates, database schema, journal persistence, prayer recording implementation, and Bible delivery code are not replaced. Completed-journal lookup keeps its recoverable error state rather than silently creating a second entry. Mockup-only percentages, invented reading collections, fake playlist lists and attributed devotional paraphrases are not installed. A current activity is not counted as completed. Foundation readiness remains its existing workbook-based measure.

## Scenery

`public/images/morning-sanctuary.webp` is a 1000px, 6,892-byte decorative photographic crop/composite from the already approved generated worship mockup. It contains scenery and foreground objects, not a screenshot of the interface. Interface headings and controls are real HTML. No remote image service, runtime generation API, new credentials, or Lovable credits are needed for this design. The previous SVG remains available for existing fallback references.

## Verification

`MorningSanctuary.test.tsx` covers state accuracy, owner-scoped resume, existing-journal recovery, all foundation destinations, activity counts, shared headings, prayer values/recording paths and single-active gratitude voice. The existing repository workflow also runs the full lint, test and production build commands.

`node scripts/verify-morning-sanctuary-ui.mjs` renders real components and editors with isolated fixtures at desktop, phone and narrow widths plus selected dark-mode states. It captures screenshots and checks overflow, footer reachability, fields and key interactions. The isolated Bible-delivery fixture is explicitly labelled test content, not a Scripture quotation. It does not authenticate as a real user, access their content, record a real microphone, or prove end-to-end Supabase saving. Fixture files are removed after the run and are not production routes.
