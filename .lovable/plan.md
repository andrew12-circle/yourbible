# Day One-class Journal, fully interconnected

Replicate Day One's structure (multiple colored journals, big cover header, List/Calendar/Media/Map tabs, day-stamped rows, prompts, auto location/weather/map) and weave it through every other surface in the app — Reader, Framework beliefs, Chat, Daily, Study, Tensions, Influences, Mirror.

---

## 1. Data model (one migration)

New tables:
- `journals` — `id, user_id, name, color, icon, cover_kind ('color'|'photo'), cover_value, sort_order, is_default, source_kind ('manual'|'belief_layer'|'book'|'theme'), source_ref, created_at, updated_at`
- `journal_prompts` — `id, user_id?, category, text, locale` (seeded with ~80 prompts; nullable user_id = global library)
- `journal_entry_links` — `id, user_id, entry_id, target_kind ('verse'|'belief'|'tension'|'study'|'daily'|'chat_thread'|'artifact'), target_ref jsonb, created_at` (replaces the single `verse_ref` / `belief_id` columns; entry can link to many things)

Modify `journal_entries`:
- add `journal_id uuid not null` (default → user's "Journal" default row, backfilled in same migration)
- add `pinned boolean default false`
- add `prompt_id uuid null`
- add `weather_temp_c numeric null`, `weather_icon text null` (split out from text `weather`)
- keep `verse_ref` and `belief_id` for backward compatibility but treat `journal_entry_links` as source of truth going forward

Auto-create on first load (one-time, server-side via edge fn `journal-bootstrap`):
- Default "Journal" (blue)
- One per Framework layer the user has filled in (Theology / Anthropology / Ethics …) — color-coded
- "Verse Notes" — auto-receives verse-side captures
- "Daily" — auto-receives entries written from Daily reading
- "Chat" — auto-receives entries created from a chat message ("Save to journal")

All new tables: RLS `auth.uid() = user_id`, proper indexes (`journal_id`, `entry_at_ts desc`, `pinned`, GIN on `tags`).

---

## 2. Day One UI (responsive)

### Routes
```
/journal                       → split shell (sidebar + list + entry on ≥ md)
/journal/j/:journalId          → list scoped to one journal
/journal/j/:journalId/calendar
/journal/j/:journalId/media    (photo grid)
/journal/j/:journalId/map      (entries plotted on Mapbox-free Leaflet/OSM map)
/journal/today                 → today + on-this-day strip
/journal/prompts               → prompt library
/journal/new?journalId=…&promptId=…&verse=…&belief=…
/journal/:id                   → reader view
/journal/:id/edit
/journal/mirror                → existing mirror page (kept)
```

### Shell layout
```
┌──────────────┬───────────────────────┬────────────────────────────┐
│ JournalsRail │ EntryList             │ EntryReader                │
│  • All       │  Big colored header   │  Title, body, photos       │
│  • Journal   │  GOD                  │  Map (lat/lng)             │
│  • GOD ●     │  2024 — 2026          │  Footer: location · 70°F · │
│  • Thoughts  │  [List|Cal|Media|Map] │           journal name     │
│  • + Add     │  Pinned …             │  Linked: verses · beliefs ·│
│  • More      │  May 2026             │           tensions · chats │
│  • Today     │   FRI                 │                            │
│  • Prompts   │   08  Feeling Down …  │                            │
└──────────────┴───────────────────────┴────────────────────────────┘
```
- ≥ md: three columns visible. < md: stacked, iPhone-style push navigation (rail → list → reader).
- Use shadcn `SidebarProvider` for the rail with a collapse trigger.
- Tabs (List · Calendar · Media · Map) under cover header.
- Floating circular "+" FAB in cover color, bottom-right.

### Cover header
Big colored block (uses `journal.color`) with title in 36px bold, subtitle = year range computed from entries. Optional photo cover. White card slides up underneath holding the tab bar — exactly the Day One feel from the screenshots.

### Entry row
```
┌─────┬─────────────────────────────────────────┐
│ FRI │ Feeling Down                            │
│ 08  │ So it looks like I did fail a test…     │
│     │ 6:02 PM · 200 Cavanaugh Ln · 70°F Clear │
└─────┴─────────────────────────────────────────┘
```
Pinned section pinned to top with pin icon + heart for favorited entries.

### Entry reader
- Title (28px bold), serif body at comfortable measure
- Inline photos (lightbox)
- Mini-map under body (Leaflet + OpenStreetMap tiles, no key)
- Footer chip strip: location · weather · journal name (colored)
- "Linked" panel showing every connection — each links back to the source

---

## 3. Interconnection — wire Journal into every surface

### Reader (Bible) → Journal
- Selection toolbar already has "Journal this verse" — route now opens composer prefilled with `verse_ref` + auto-link, defaults to "Verse Notes" journal.
- Verse sheet shows existing journal entries that mention that ref (collapsible "From your journal").

### Framework / Belief detail → Journal
- "Your journal" tab on Belief detail listing entries linked via `journal_entry_links` where `target_kind='belief'`.
- "New entry about this belief" button → composer prefilled.
- Belief layer detail surfaces the layer's auto-created journal.

### Chat → Journal
- Each assistant message gets a "Save to Journal" action → composer prefilled with the message body and a link to the chat thread.
- Chat system prompt receives last 10 journal entries (where `analyze_for_mirror=true`) as context so it can reference them ("Last week you wrote…").

### Daily reading → Journal
- Daily page gets "Reflect in journal" button → composer prefilled with passage + reading prompt; auto-saves to "Daily" journal and links to that day's `daily_readings` row.

### Study / Tensions / Influences → Journal
- Each surfaces a "Related entries" strip pulled from `journal_entry_links`.
- Tension detail offers "Wrestle with this in your journal".

### Mirror → Journal (already partial)
- Conflict cards deep-link into the offending entries (passes entry IDs through `aggregate.evidence_entry_ids`).
- "Open all evidence" filters the list view.

### Home tile
- Streak + last entry preview + "Today's prompt" button.

---

## 4. Auto location / weather / map

- On composer mount, request `navigator.geolocation`.
- Reverse-geocode via OSM Nominatim (`https://nominatim.openstreetmap.org/reverse`, no key, attribution shown in footer).
- Weather via Open-Meteo (`https://api.open-meteo.com/v1/forecast`, no key) — store `weather_temp_c` + `weather_icon` (mapped from WMO code).
- Both behind a single client helper `src/lib/journal/context.ts` with timeout + graceful failure.
- Map render: Leaflet + OSM tiles, lazy-loaded only on entry reader and Map tab. Privacy: stays per-entry, never sent anywhere except where the user already opted into mirror analysis.

---

## 5. Prompts

- Seed `journal_prompts` with curated faith-oriented prompts (gratitude, lament, doubt, scripture reflection, relationships, vocation…) plus generic Day One classics.
- `/journal/prompts` shows categorized cards; tap → composer with `prompt_id` set.
- "Today's prompt" picks one deterministically per (user, date).

---

## 6. Media / Map / Calendar tabs

- **Media** — flat photo grid from `journal_photos` scoped to journal, grouped by month, lightbox on tap.
- **Map** — Leaflet world map with marker clusters, click marker → entry preview popover.
- **Calendar** — already exists; restyle to Day One month grid with day-cell thumbnails.

---

## 7. Edge functions

- `journal-bootstrap` — idempotent: ensures default journals exist, creates layer/book journals on demand.
- `journal-prompt-today` — picks the day's prompt.
- `journal-score-entry` — keep as-is, runs on save when `analyze_for_mirror=true`.
- `journal-mirror` — keep, extend to return `evidence_entry_ids` per conflict.
- `framework-chat` — extend system prompt with recent journal context (opted-in entries only).

---

## 8. Phased rollout

**Phase 1 — Foundation (this build)**
- Migration (journals, links, prompts, columns), bootstrap fn, seed prompts.
- New shell with rail + list + reader, multi-journal CRUD, cover header, tabs scaffolded (List + Calendar live; Media/Map tab placeholders).
- Composer auto-captures geo + weather, supports multi-link, prompt selection.
- Reader Verse-side capture rerouted to new composer with link.
- Belief detail "Your journal" panel.
- Home tile updated.

**Phase 2 — Surfaces**
- Media grid + Leaflet map tab + entry-reader mini-map.
- Chat "Save to journal" + chat context injection.
- Daily/Study/Tensions/Influences related-entries strips.
- Mirror evidence deep-linking.

**Phase 3 — Polish**
- Prompt library page, today's prompt on home, on-this-day strip, search across journals, export per-journal as markdown zip.

---

## Technical notes

- Reuse `app-theme` tokens; per-journal colors stored as Tailwind-compatible HSL strings on the `journals` row so every cover/header/FAB pulls from one source.
- Backward compat: existing `verse_ref` / `belief_id` migrated into `journal_entry_links` rows in the same migration; columns kept readable to avoid breaking the current detail page until it switches.
- Leaflet via `react-leaflet` + `leaflet` (small, no key, OSM tiles). Lazy-imported.
- Nominatim usage requires a UA + ≤ 1 req/sec — acceptable for personal-scale; cache last lookup in `sessionStorage`.
- All new client paths gated by `useAuth`, redirect to `/auth` if missing.

---

## Open question (non-blocking — defaulted)

Map provider: Leaflet + OSM (free, no key, attribution in footer). If you'd rather use Mapbox/Apple-style tiles later we can swap by changing one file.
