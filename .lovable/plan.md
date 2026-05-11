## Goal

Build a Day One-class **Journal** that's deeply tied to your beliefs, scripture, and chat — and that powers a "worldview mirror" report ("you say God is loving, but 47% of your entries assume abandonment").

This is a multi-phase build. The plan ships value at the end of each phase so you're not waiting for everything.

---

## Data model (one migration, all phases)

New tables (all RLS, `user_id = auth.uid()`):

- **`journal_entries`** — `id, user_id, entry_at (date), entry_at_ts (timestamptz, for time-of-day), title?, body (text), mood (smallint -2..+2), weather?, location_name?, lat?, lng?, tags (text[]), verse_ref?, belief_id?, analyze (bool, default false), created_at, updated_at`
- **`journal_photos`** — `id, user_id, entry_id, storage_path, width?, height?, created_at`. Storage bucket `journal-photos` (private, per-user folder).
- **`journal_entry_scores`** — one row per analyzed entry: `entry_id, user_id, axes (jsonb: {love_fear, trust_abandonment, grace_guilt, hope_despair, agency_helplessness, gratitude_resentment …} each -1..+1), themes (text[]), assumptions (text[]), created_at`. Only populated when `entry.analyze = true`.
- **`journal_mirror_reports`** — `id, user_id, range_start, range_end, kind ('weekly'|'on_demand'), aggregate (jsonb), conflicts (jsonb: array of {belief_id, belief_statement, axis, evidence_excerpts[], severity, summary}), created_at`.

Indexes on `(user_id, entry_at desc)`, `(user_id, tags gin)`.

---

## Phase 1 — Standalone journal that feels like Day One

### Routes & UI
- New top-level tile **Journal** on `/home` (and dock slot).
- `/journal` — **Timeline**: reverse-chronological feed grouped by month, large hero photo per entry, mood dot, tags, location. Search bar (full-text on body+title+tags), tag filter chip row, year scrubber.
- `/journal/calendar` — month grid with dots/photo thumbnails per day; tap → that day's entries.
- `/journal/new` and `/journal/:id/edit` — composer with:
  - Title (optional), rich-ish body (textarea + markdown — no heavy editor lib for v1)
  - Mood picker (5-point), tag input (chips), date+time picker (defaults now)
  - Photo attach (multi, drag-drop, mobile camera input)
  - Location: "use my location" → reverse-geocode label (browser geolocation + Nominatim or skipped if denied)
  - Weather: optional, fetched from a free endpoint at save time
  - **"Link to"** picker: verse (opens chapter picker), belief (autocomplete from belief_nodes)
  - **"Include in worldview mirror"** checkbox (off by default — your opt-in choice)
- `/journal/:id` — read view with on-this-day strip ("3 entries on this date in past years"), edit/delete, "open verse," "open belief."
- **Streaks** widget: current streak + longest streak based on distinct `entry_at` days.

### Verse-side capture
- In `ReaderPage` selection toolbar, add **Journal this** → navigates to `/journal/new?verse=<ref>&text=<excerpt>` with body pre-filled.

### Storage
- Bucket `journal-photos`, private, path `{user_id}/{entry_id}/{file}`.
- Thumbnails generated client-side (canvas resize) before upload to keep timeline fast.

### Done = Phase 1
You can journal daily, attach photos, search, see calendar/streaks, and link entries to verses/beliefs.

---

## Phase 2 — The worldview mirror

### Per-entry scoring (only if `analyze = true`)
- New edge function `journal-score-entry` (Lovable AI Gateway, `google/gemini-2.5-flash` — cheap, fast).
- Trigger: client calls it right after save when `analyze=true`. Also a **"Score this entry"** button on read view.
- Returns the `axes`, `themes`, `assumptions` JSON via tool-calling (same pattern as `framework-detect-tensions`). Stored in `journal_entry_scores`.

### Aggregate + conflict detection
- New edge function `journal-mirror` (model: `google/gemini-2.5-pro`, the heavy reasoner).
- Inputs: all scored entries in `range_start..range_end`, plus the user's `belief_nodes` (statement + answer + confidence).
- Logic:
  1. Compute aggregate axis distribution across entries (e.g. % of entries skewing toward fear vs love).
  2. For each high-confidence belief, compare to the aggregate. Flag dissonances where the lived data contradicts the stated belief.
  3. Pick representative excerpts (entry IDs + 1–2 sentence quotes) as evidence.
- Output (stored in `journal_mirror_reports.conflicts`) is shaped exactly like your example:
  > "You claim God is loving (confidence 90), but 47% of your entries assume abandonment, punishment, or fear-based guidance." + 3 quoted excerpts + suggested reflection prompt.

### Surfaces
- **`/journal/mirror`** page — list of past reports, current report card with conflicts as collapsible cards (axis bar, %, excerpts, "open entry," "open belief," "start a chat about this" → seeds a `chat_thread`).
- **Weekly auto-run**: `pg_cron` job every Sunday 6pm user-local-ish (UTC for v1) calls `journal-mirror` for each user with ≥5 scored entries that week.
- **On-demand button** "Run mirror now" on `/journal` and `/journal/mirror`.
- Notification surface: a soft red dot on the Journal tile when a new mirror report has unread conflicts.

### Done = Phase 2
The "47% assume abandonment" insight ships, both automatically and on-demand.

---

## Phase 3 — Polish & integration (post-MVP)

- **On-this-day** widget on `/home` showing today's entries from prior years.
- **"Journal this verse"** quick action from any verse note.
- **Belief detail page**: show "evidence in your journal" — entries linked to or scored against this belief, with a mini axis bar.
- **Chat handoff**: from a mirror conflict, "Talk to my Socratic partner about this" pre-loads context into a new `chat_thread`.
- **Export**: download journal as JSON or Markdown zip (Day One parity).
- **Search upgrades**: postgres `tsvector` index for full-text.

(Photos/location/weather are in Phase 1, not punted to Phase 3 — that was your "Day One-class" ask.)

---

## Files (rough)

**Phase 1**
- migration: tables + storage bucket + RLS
- `src/pages/journal/JournalPage.tsx` (timeline)
- `src/pages/journal/JournalCalendarPage.tsx`
- `src/pages/journal/JournalEntryPage.tsx`
- `src/pages/journal/NewJournalEntryPage.tsx`
- `src/components/journal/EntryCard.tsx`, `MoodPicker.tsx`, `TagInput.tsx`, `PhotoUploader.tsx`, `OnThisDayStrip.tsx`, `StreakBadge.tsx`
- `src/lib/journal/geolocation.ts`, `weather.ts`
- `src/App.tsx` routes; `src/pages/HomePage.tsx` add tile + dock
- `src/components/bible/SelectionToolbar.tsx` add "Journal this"

**Phase 2**
- `supabase/functions/journal-score-entry/index.ts`
- `supabase/functions/journal-mirror/index.ts`
- cron job (via insert tool, not migration)
- `src/pages/journal/JournalMirrorPage.tsx`
- `src/components/journal/ConflictCard.tsx`, `AxisBar.tsx`

---

## Privacy guarantees baked in

- `analyze` defaults `false`. Scoring/mirror only ever reads entries with `analyze=true`. The toggle is visible in the composer and on the read view (you can flip it later).
- `journal_entry_scores` cascade-deletes when an entry is deleted or `analyze` is flipped off.
- All tables RLS; photos in private bucket scoped to `{user_id}/`.

---

## Open question (cheap to defer)

Weather + reverse-geocoding both need a tiny external call. I'd use **Open-Meteo** (no key) for weather and **OpenStreetMap Nominatim** (no key, attribution required) for reverse-geocoding — both free, both fine for personal-scale use. Say the word and I'll bake them in; otherwise location is a free-text field in v1.
