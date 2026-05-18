# Inline AI Journal (chat-while-you-write)

## What changes

Right now the "Reply with AI" toggle waits until you tap Save, then bounces you to a separate chat page. You want it to feel like ChatGPT *inside* the journal editor: you write, hit "Send to AI" (or just Send when the toggle is on), the AI replies inline beneath your entry, you keep going, and when you finally tap Save the whole back-and-forth is saved as one journal entry.

## How it will work

1. **Toggle stays where it is** on the New Entry page ("Reply with AI" in the Privacy section). When ON, the editor switches into a conversational mode.

2. **Editor becomes a conversation panel:**
   - Your title + metadata (mood, tags, verse, location, photos) stay at the top — unchanged.
   - The single body textarea is replaced by a stacked transcript: your turns on one side, AI replies on the other, rendered with markdown like the existing chat.
   - A composer at the bottom (textarea + Send button + the existing Dictate / Sketch buttons) adds your next turn. Pressing Send appends your turn to the transcript and streams the AI reply underneath.
   - Each turn is just text + timestamp held in local state until you Save.

3. **AI call** reuses the existing `my-ai-chat` edge function (same retrieval over beliefs, past journals, identity, artifacts) — no new backend. We pass the full local transcript on every send so it has full context, exactly like the standalone chat page.

4. **Saving = one journal entry containing the whole conversation:**
   - On Save, we create a `journal_entries` row with `entry_kind = "chat"`, body = a serialized transcript (Markdown with `**You:** …` / `**AI:** …` blocks, ordered by timestamp) so it's readable anywhere the journal renders plain text.
   - We also create a paired `my_ai_chats` row with `journal_entry_id = entry.id` and insert every turn into `my_ai_messages` (role `user` / `assistant`). That way the same conversation is reopenable on the chat page later with full fidelity.
   - Photos, tags, mood, verse, belief link, prompt id, weather, location — all attach to the same single entry, same as today.

5. **Toggle OFF = today's behavior unchanged.** Plain textarea, plain save, no chat row created. Switching the toggle off mid-draft keeps whatever text is in the composer as the body.

6. **Editing an existing entry:** if you open a saved chat-journal in the editor, it loads the transcript back into the conversation panel (read from `my_ai_messages` when present, falling back to parsing the body). New turns append; Save updates both the entry body and the message rows.

7. **Vents stay private** — toggle is hidden for `entry_kind === "vent"`, same rule as today.

## Out of scope

- Streaming token-by-token rendering (we'll show a "thinking…" indicator and drop the reply in when it returns, matching the current chat page).
- Auto-AI on every entry without the toggle.
- Per-turn edit/delete inside the transcript before save (turns are append-only in the composer; you can clear the whole draft).
- Changing the standalone `/journal/chat/:id` page — it keeps working and will open these saved conversations.

## Files to touch

- `src/pages/journal/NewJournalEntryPage.tsx` — add transcript state, conversation UI when toggle is on, save path that writes entry + chat + messages.
- `src/pages/journal/JournalEntryPage.tsx` — render chat-kind entries as a transcript (read `my_ai_messages` if present) instead of raw body text.
- Small shared helper in `src/lib/journal/` for serializing/parsing the transcript markdown so the body field stays human-readable.

No migrations. No new tables. No edge function changes.
