# Reader Companion Pane — read, journal, dialogue, crystallize

A single floating pane on the Bible reader (`/read/:book/:chapter`) that you can drag, snap, dock, or minimize. It carries three connected modes for the verse/passage you've selected: **Journal**, **Dialogue (AI)**, and **Crystallize (belief)**. Outside content comes from your own artifacts first, then optional web.

---

## 1. The Companion Pane (UI)

A new floating panel mounted on `ReaderPage`.

- **Movable**: drag by the header. Snap zones: dock-right, dock-left, dock-bottom (slide-up), or free-float anywhere.
- **Resizable**: corner handle. Remembers width/height/position per device in `localStorage`.
- **States**: minimized pill (bottom-right), open card, full-sheet (mobile only).
- **Header**: shows current scope chip — e.g., *John 1* or *John 1:14* — plus tabs `Journal · Dialogue · Belief`, a pin button, and a close.
- **Scope binding**: if you've selected a verse via the existing `SelectionToolbar`, scope = that verse range; otherwise = whole chapter. A "Change scope" affordance lets you flip between them.

A small **"Open Companion"** button (book + pen icon) is added to the reader top bar so it can be re-opened after closing.

---

## 2. Tab 1 — Journal

In-place writing tied to the current scope.

- Title, body, mood, tags (reuse pieces from `NewJournalEntryPage` but inline, not full page).
- Auto-creates a `journal_entries` row with `verse_ref` set (e.g., `John 1:14`) and a `journal_entry_links` row of kind `verse` so it shows up on the verse later.
- "Save & continue" keeps the entry open and switches to **Dialogue**.
- An entry started in the pane auto-saves draft to `localStorage` keyed by `book/chapter/verse` so flipping verses doesn't lose work.

---

## 3. Tab 2 — Dialogue (AI)

A focused multi-turn chat scoped to *this passage + this journal entry*.

- System context = passage text + your journal draft + (optional) your existing belief on this topic if one is linked.
- Behaves Socratically: asks follow-up questions to deepen your thinking, not verdicts.
- A **"Bring in other perspectives"** action runs a tool that:
  1. Searches your own `artifacts` + `artifact_claims` (semantic match on passage / topic) and surfaces relevant claims with the artifact title.
  2. If you opt in (toggle), then runs a web search for tradition views and commentary on the passage.
  Results appear as inline cards inside the chat that you can quote into your journal.
- Conversation persists to `chat_threads` / `chat_messages` with a new `mode = "reader_dialogue"` and a `target_ref` JSON (`{book, chapter, verse, journal_entry_id}`).

---

## 4. Tab 3 — Crystallize (Belief)

When you're ready, AI distills the journal + dialogue into 1–3 candidate belief statements.

- Each candidate is editable. You pick layer (Foundations / Doctrine / etc.), confidence slider, tags.
- **Save** writes a `belief_nodes` row, plus:
  - `belief_scriptures` row with `ref = "John 1:14"` (`role = supports`).
  - `belief_sources` row pointing back to the journal entry / chat thread.
  - `journal_entry_links` row of kind `belief`.
- **"Mark as core for this chapter"** checkbox: tags the belief with `core:John-1` so the chapter shows it as the anchor on next visit.
- A new chapter header strip on `ReaderPage` shows: *"Your anchor belief for John 1: …"* when one exists.

---

## 5. Outside content priority

The "Bring in other perspectives" tool always runs in this order:

1. `artifacts` + `artifact_claims` you own — top 5 most relevant.
2. (Optional toggle) Web search via existing edge function pattern, returning short snippets + links. Off by default.
3. (Optional) Tradition views from `tradition_views` if any exist for the linked belief.

Each result has a "Quote into journal" and "Add as source" action.

---

## 6. Navigation back from a belief

Saved belief detail page (`BeliefDetailPage`) gets a "Where it came from" section listing the verse, the journal entry, and the chat thread, all clickable. Clicking the verse returns you to `/read/John/1` with the Companion pre-opened on Belief tab for that verse.

---

## Technical details

**New files**
- `src/components/reader/CompanionPane.tsx` — floating draggable shell, tab switcher, scope chip, position persistence.
- `src/components/reader/CompanionJournalTab.tsx` — inline journal editor.
- `src/components/reader/CompanionDialogueTab.tsx` — chat UI bound to a thread, renders tool cards.
- `src/components/reader/CompanionBeliefTab.tsx` — candidate belief editor + save flow.
- `src/lib/reader/companionStore.ts` — Zustand store for open state, scope, position, active tab, draft.
- `supabase/functions/reader-dialogue/index.ts` — streaming chat endpoint with tools: `search_my_artifacts`, `web_perspectives` (gated), `propose_beliefs`. Uses Lovable AI Gateway via `@ai-sdk/openai-compatible` + `streamText` with `stopWhen: stepCountIs(50)`.

**Edits**
- `src/pages/reader/ReaderPage.tsx` — mount `<CompanionPane/>`, add toolbar button, optional anchor-belief header strip, pass current selection into the store.
- `src/components/bible/SelectionToolbar.tsx` — add "Open in Companion" action.
- `src/pages/framework/BeliefDetailPage.tsx` — "Where it came from" section.
- `src/App.tsx` — no route changes needed.

**Database** (one migration)
- Add `target_ref jsonb` and widen `mode` to allow `"reader_dialogue"` on `chat_threads`.
- Add `is_core boolean default false` and `core_scope text` (e.g., `John-1`) on `belief_nodes`, with an index on `(user_id, core_scope)`.
- No other schema changes required — existing `belief_scriptures`, `belief_sources`, `journal_entries.verse_ref`, and `journal_entry_links` already cover the link graph.

**AI**
- Default model: `google/gemini-3-flash-preview` via Lovable AI Gateway.
- Tools defined with Zod schemas. `propose_beliefs` returns `{ candidates: [{ statement, layer, confidence, tags, rationale }] }`.
- The Crystallize tab calls `propose_beliefs` once on entry, then saves selected candidate(s) directly to the DB from the client.

---

## Out of scope for this pass

- Verse-level inline notes "in flow" under each verse (you chose movable pane instead).
- Audio dictation into the Journal tab (can come later — `voice-memos` bucket already exists).
- Cross-chapter belief rollup view.
