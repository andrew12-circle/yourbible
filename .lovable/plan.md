## Goal

Make creating a journal entry feel exactly like Day One: a clean, full-height writing surface with a date/meta header on top, a Done button, and a slim bottom toolbar of attachment actions. Add a "Chat with AI" action to that toolbar that flips the bar in place into the message composer so the AI conversation happens right inside the journal entry — no separate page.

## Reference vs. today

Day One (target):
- Big date/time header, three-dot menu and "Done" on the right
- Single meta line: journal name • location • weather
- Full-bleed writing area, no labeled sections
- Bottom toolbar of icon+label tiles: Photos · Templates · Prompts · Audio
- "More" expander reveals: Suggestions, Tag, Camera, Video, Draw, Scan to PDF, Scan Text, File

Today's `NewJournalEntryPage.tsx`:
- Generic "New entry" header with a back arrow
- Title input, Entry Type select, then a Textarea
- Long stacked sections (Photos grid, Mood, Tags, When/Where, Linked verse/belief, Mirror toggle, "Journal with AI" toggle)
- AI chat only appears after flipping the "Journal with AI" switch buried at the bottom

## What to build

### 1. Day One–style entry shell

Rebuild the layout of `src/pages/journal/NewJournalEntryPage.tsx` (also reused for `/journal/:id/edit`):

- New top header (replaces `JournalLayout` header for this page):
  - Left: large date + time (from `entryAt`), tappable to open a date picker sheet
  - Right: three-dot menu (`MoreHorizontal`) + "Done" button (saves and exits)
- Meta line under header: journal name • location • weather (tappable to edit location)
- Inline, optional title (placeholder "Title", borderless, large display font — only shown when typed or focused)
- Full-height body Textarea:
  - Borderless, transparent background, fills remaining viewport
  - Auto-grows; placeholder uses the existing kind-aware hint
  - Dictation interim text floats above the bottom bar
- Bottom toolbar (sticky, safe-area aware) — four primary tiles:
  - Photos (opens file picker — existing flow)
  - Templates (placeholder sheet, non-functional v1)
  - Prompts (opens existing prompt picker / journal-prompts route)
  - Audio (triggers existing `DictateButton`)
  - Chat with AI (new tile — flips bar into composer, see step 3)
- "More" chevron beneath the tiles opens a sheet with: Tag, Camera, Sketch (existing), Mood, When, Where, Linked verse, Linked belief, Entry type, Mirror toggle. This is where today's stacked sections move so the writing surface stays clean.

### 2. Move existing fields into the "More" sheet

All current sections still exist, just relocated into the More sheet (a `Sheet` from the bottom):
- Mood, Tags, Date/time, Location, Linked verse, Linked belief, Entry type, "Include in worldview mirror"

The "Journal with AI" toggle is removed — replaced by the new toolbar action.

### 3. "Chat with AI" flip-in-place

Tapping the Chat with AI tile:
- Calls existing `ensureChatEntry()` to create/load the entry + `my_ai_chats` row
- Replaces the bottom toolbar with the same floating pill composer used in `JournalChatPage` (plus icon, textarea, mic, voice toggle, send)
- Renders the chat transcript directly above the composer, inside the same scroll surface as the body text
  - When the entry already has body text, that body shows as the first user-side message in the thread
  - Subsequent turns stream below
- A small "Back to writing" affordance (e.g. an `X` on the composer or a chip above it) restores the standard toolbar without losing draft text
- "Done" in the header still saves the chat-mode entry (entry_kind = 'chat') with the transcript persisted, same path as today

### 4. Reuse, don't duplicate

- Extract the composer pill (textarea + plus + mic + voice + send + Retry/Stop chips) from `JournalChatPage.tsx` into a shared `JournalChatComposer` component under `src/components/journal/`, used by both pages
- Reuse the existing `ensureChatEntry`, `loadChatTurns`, `sendToAi`, dictation, and TTS logic — only the surrounding layout changes
- Keep the standalone `JournalChatPage` for opening existing chat entries from the list; the new inline flow just means a brand-new entry no longer has to redirect to `/journal/chat`

### 5. Out of scope (v1)

- Templates and Suggestions tiles are visible but show a "Coming soon" toast
- Video, Scan to PDF, Scan Text, File from Day One's More menu are not added yet (not in your current feature set)

## Technical notes

- File touched: `src/pages/journal/NewJournalEntryPage.tsx` (major rewrite of the JSX render tree; data/save logic largely unchanged)
- New file: `src/components/journal/JournalChatComposer.tsx` (extracted floating pill)
- New file: `src/components/journal/EntryMoreSheet.tsx` (Sheet wrapping the relocated fields)
- Use existing shadcn `Sheet`, `Popover`, `Button`, `Textarea`
- Header date tap opens a `Sheet` with the existing `datetime-local` input
- Body Textarea: `min-h-[60dvh]` and `flex-1` inside a `flex flex-col min-h-[calc(100dvh-...)]` shell so it always fills the screen above the toolbar
- Toolbar uses the same `fixed inset-x-0 bottom-0` pattern + `env(safe-area-inset-bottom)` we just shipped for the chat composer, so it never scrolls away on mobile
- Routing unchanged: `/journal/new`, `/journal/:id/edit`, `/journal/chat/:id` still work; the kind=chat redirect can stay as a fallback

## Acceptance check

- Opening `/journal/new` shows: big date header, Done button, meta line, empty writing surface, bottom tile bar — no visible Mood/Tags/Privacy stack
- Typing fills the body; the bottom bar stays pinned, no scrolling needed to reach it
- Tapping "Chat with AI" turns the bottom bar into the floating message pill; AI replies appear above it inside the same view
- Tapping "More" reveals all the previously-stacked options
- "Done" saves and returns to the entry view as today
