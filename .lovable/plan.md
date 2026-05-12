## How to seed this timeline

The seeder UI is already wired up — no code changes needed.

1. Go to **Settings → Knowledge base → Seed timeline**.
2. Paste the JSON block you sent into the textarea.
3. Click **Validate** — should report ~34 journal entries, 21 books, 14 people, plus mentions.
4. Click **Seed** — writes one journal entry per `spiritual_timeline` event (dated to its `date`), tagged with `type` + themes, and creates entities for every book/person/theme with mentions linking back to the entries.
5. If you need to redo it, click **Clear seeded entries** (only removes rows tagged with the seed marker).

## Optional adjustments — tell me if you want any

- **Future-dated entries**: ~16 events are dated after today (2026-05-12). Keep as-is, clamp to today, or skip?
- **Standalone books list**: top-level `books` array has 21 titles, 11 of which aren't tied to a dated event. Currently they'd seed as bare entities. Attach the extras to the 2025-07-01 "book_integration" entry instead?
- **Belief nodes**: should `major_themes` also create rows in `belief_nodes` (so they show up in the Framework graph), not just tags?

If none of those apply, just run Validate → Seed from Settings.