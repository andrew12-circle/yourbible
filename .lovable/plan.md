## Goal

Match the Day One desktop/iPad layout you screenshotted: three persistent columns — **Sidebar (journals & smart views) | Entry List (with view toggles + search) | Editor (inline)** — so reading and writing happen in the same screen with no navigation. Mobile collapses gracefully.

## Current vs target

Today the journal is two columns (rail + a single content area), and opening or composing an entry navigates to a separate full‑screen page (`/journal/:id` or `/journal/new`). The screenshot shows everything inline: pick a journal on the left, pick an entry in the middle, edit it on the right.

## New layout

```text
┌─────────────┬──────────────────────┬──────────────────────────────┐
│  SIDEBAR    │   ENTRY LIST         │   EDITOR                     │
│             │                      │                              │
│ ⚙           │  ▢ ☷ 📅   👁 🔍      │  …  ⛶  ▤   May 11, 10:42 +   │
│ Today       │  ┌─────────────┐     │  ─────────────────────────── │
│ Daily Chat  │  │ MON 11      │     │  H ▾  • 1. ☑ ❝ ▦ 📎 🏷 ✨    │
│ Prompts     │  │ 10:42 · …   │     │                              │
│ All Entries │  └─────────────┘     │  [rich-text editor body]     │
│             │  Jul 2025            │                              │
│ PERSONAL    │  · Sun 6 …           │                              │
│ ▣ Journal   │  · Sat 5 …           │                              │
│ ▣ GOD       │  · Fri 4 …           │                              │
│ □ World …   │                      │                              │
│             │                      │                              │
│ SHARED      │                      │                              │
│ + New …     │                      │  Journal · 64°F · 200 Cav…   │
└─────────────┴──────────────────────┴──────────────────────────────┘
```

Behavior:
- Single route owns all three panes: `/journal`, `/journal/j/:journalId`, `/journal/j/:journalId/e/:entryId`, `/journal/e/:entryId`. URL drives selection so links/back button still work.
- Clicking an entry in the middle list updates the right pane in place (no page transition).
- "New entry" creates a draft row immediately and focuses the editor on the right (no separate `/journal/new` flight). The composer page stays available for deep-linking but the primary flow is inline.
- The middle pane has the **List / Photos / Calendar** segmented toggle (icons in screenshot), a search icon that expands into the existing search input, and an "analyze for mirror" eye toggle scoped to the visible list.
- The editor pane has the iOS/Day One toolbar row: heading dropdown, bullet, numbered, checklist, quote, table, attachment, tag, AI (`✨`). Clicking opens existing dialogs (mood, tags, photo upload) — we are not building a new rich text engine, just rearranging existing controls into a sticky toolbar over the body textarea.
- Footer strip under the editor shows the journal name, weather, and location (already captured on entries).
- Top of editor: date/time (click → date picker), `…` menu (export, delete, pin), full‑screen toggle, mini‑map toggle, **+** (new entry in current journal), and an ✕ that collapses the editor back to two panes.

## Responsive rules

- ≥ 1280 px: all three panes visible (matches screenshot).
- 900 – 1279 px: sidebar collapses to icon rail; entry list + editor visible.
- < 900 px (phone): one pane at a time with current iOS push navigation. Sidebar opens in the existing sheet. This preserves today's mobile experience.

## Pages and components to change

New:
- `src/components/journal/JournalDeskLayout.tsx` — the 3‑column shell (sidebar slot, list slot, editor slot, responsive collapsing, resize handles persisted to localStorage).
- `src/components/journal/EntryListPane.tsx` — extracted list + view toggle + search from `JournalPage.tsx`, emits `onSelect(entryId)`.
- `src/components/journal/EntryEditorPane.tsx` — inline editor reusing the form fields from `NewJournalEntryPage`/`JournalEntryPage` (title, body, mood, tags, photos, verse_ref, belief link, analyze toggle), with the new sticky toolbar and footer strip. Autosaves on blur / debounce.
- `src/components/journal/EditorToolbar.tsx` — the H / list / quote / table / attach / tag / AI bar.

Edits:
- `src/pages/journal/JournalPage.tsx` → renders `JournalDeskLayout` and wires `EntryListPane` + `EntryEditorPane`. Keeps `JournalShell` only for sub‑pages that still use the cover (mirror, prompts, calendar, media, map).
- `src/pages/journal/JournalEntryPage.tsx` → on desktop, redirects to the inline route; on mobile, keeps the current full‑screen view.
- `src/pages/journal/NewJournalEntryPage.tsx` → on desktop, creates a draft and routes to the inline editor; on mobile, stays as today.
- `src/components/journal/JournalsRail.tsx` → add the **PERSONAL / SHARED** section headers, add `Daily Chat` smart view (links to `/framework/chat`), keep current items, add settings cog at the very top, move the "All Entries" item under the smart‑view group as in the screenshot. No data‑model changes — "shared" is a future flag, for now the section is an empty list with a `+ New Shared Journal` row that opens the same dialog with a `shared` tag (UI only).
- `src/components/journal/JournalShell.tsx` → reused only by sub‑pages; main list page no longer renders the cover banner on desktop (matches screenshot which has no large cover).

Out of scope:
- True collaborative/shared journals (auth, RLS, invites). Just the UI section.
- Replacing the textarea with a real rich‑text engine. Toolbar buttons insert markdown shortcuts into the existing body field; H, lists, quote, checklist, and table are markdown inserts. Attach/tag/AI reuse existing dialogs.
- Bible reader Companion pane (already shipped — unrelated).

## Technical notes

- State: keep selection in the URL (`/journal/j/:journalId/e/:entryId`). A small `useJournalSelection()` hook reads params and exposes `selectJournal`, `selectEntry`, `clearEntry`.
- Persistence: pane widths in `localStorage` (`yb.journal.panes = { sidebar, list }`). Reset button in the `…` menu.
- Autosave: `EntryEditorPane` debounces updates to `journal_entries` (350 ms) and on blur, identical fields to `NewJournalEntryPage`. New drafts are inserted immediately on "+" so the row appears in the middle list and the URL updates to `/e/:id`.
- Toolbar AI button reuses `journal-score-entry` (existing edge function) — no new function.
- No database migration required.

## QA checklist before sign‑off

1. Open `/journal` on desktop → see sidebar + list + empty editor placeholder ("Select an entry or press + ").
2. Click an entry → editor loads inline, URL updates to `/journal/j/<jid>/e/<eid>`.
3. Press **+** → new draft appears at top of list and editor focuses the title.
4. Type in body → row in middle list updates after debounce; refreshing the page restores the same selection.
5. Resize between sidebar/list and list/editor — widths persist after reload.
6. Shrink to tablet width → sidebar collapses to icons; further to phone → falls back to today's single‑pane flow.
7. List / Photos / Calendar toggle in the middle pane swaps the middle content without losing the selected entry.
8. Sidebar shows PERSONAL section with existing journals, SHARED section with the placeholder row, and the smart views (Today, Daily Chat, Prompts, All Entries).
