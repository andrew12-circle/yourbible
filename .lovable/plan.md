# Journal-with-AI-reply

## Goal
When journaling, flip a switch labeled "Reply with AI" — on save, the AI (already wired to your full context: identity, beliefs, journals, artifacts, entities, partner digest) replies inline. You can keep writing back, just like ChatGPT, but it never forgets. Switch off = silent journal, no reply.

## Good news: most of this already exists
- The `my-ai-chat` edge function already supports `mode:"journal"`, journal-bound chat threads (`my_ai_chats.journal_entry_id`), a `journal_bootstrap_opener` flow, and a `finalize_journal_entry_id` that writes the transcript back into `journal_entries.body`.
- Retrieval (`retrieval.ts`) already pulls identity summary, beliefs, recent journals (vents excluded), artifacts, knowledge entities, and partner walking digest. Vents stay private.
- `JournalChatPage.tsx` at `/journal/chat` is the full chat-journal UI (entry_kind=`chat`).

What's missing is the **bridge** from a regular journal entry into that AI conversation, with a toggle.

## Plan

### 1. Add "Reply with AI" toggle to `NewJournalEntryPage.tsx`
- New `Switch` near the existing `analyze_for_mirror` toggle, labeled **"Have AI reply when I save"** with subtext "Uses your beliefs, past journals, identity, and artifacts. Vents stay private."
- Default = off. Persist last choice to localStorage (`journal.reply_with_ai`).
- Disabled / hidden for `entry_kind === "vent"` (vents are private by contract).
- Hidden when `entry_kind === "chat"` (already a chat).

### 2. On save, branch:
- **Toggle off (default):** existing behavior — save entry, navigate to `/journal/:id`.
- **Toggle on:** after `journal_entries` row is saved:
  1. `update` row to set `entry_kind = "chat"` (so retrieval/finalize treat it correctly and we reuse the chat-journal contract).
  2. `insert` into `my_ai_chats` with `journal_entry_id = entryId`, `user_id`, title from entry title.
  3. Navigate to `/journal/chat/:entryId` (existing chat page) with the freshly-written body pre-seeded as the first user message.

### 3. Small extension to `JournalChatPage` to accept a "seed first user message"
- When opening with an entry that already has a `body` and zero `my_ai_messages`, post that body as the first user turn (via existing `my-ai-chat` invoke, no bootstrap opener), then render the AI reply. This makes the flow feel like: "I wrote my journal → AI responded to what I wrote."
- If body is empty, fall back to the existing bootstrap opener.

### 4. Entry-point hint on `/journal/:id` (read view)
- If a regular saved entry has no chat attached, show a small **"Ask AI to respond to this entry"** button that runs the same conversion (set entry_kind=chat, create chat row, seed body as first message, route to `/journal/chat/:id`). Lets you opt in retroactively.

### 5. Nothing changes for the silent path
- Toggle off → identical to today. No AI calls, no chat row, no extra cost.

## Technical notes
- No new tables or migrations. Reuses `journal_entries.entry_kind='chat'` + `my_ai_chats.journal_entry_id` + `my_ai_messages` already in place.
- Reuses `supabase.functions.invoke("my-ai-chat", { body: { mode:"journal", chat_id, message, journal_entry_id } })`.
- Vent privacy preserved: retrieval already filters `entry_kind.neq.vent`; the toggle is hidden for vents so they can't be converted.
- Finalize-on-leave behavior (writing transcript back to `journal_entries.body`) is already implemented in `JournalChatPage` via `finalize_journal_entry_id`.

## Files touched
- `src/pages/journal/NewJournalEntryPage.tsx` — add toggle, branch on save, conversion logic.
- `src/pages/journal/JournalChatPage.tsx` — seed-first-user-message path when entry body exists and no messages yet.
- `src/pages/journal/JournalEntryPage.tsx` — "Ask AI to respond" button on existing entries.

## Out of scope (ask if you want them)
- Auto-reply on *every* entry without a toggle.
- Streaming responses (current flow is request/response, which is fine).
- A separate "AI conversations" inbox view (chat-journals already show up in your journal list with `entry_kind=chat`).
