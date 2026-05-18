# From "LLM reply" to "cognitive continuity"

You've already got Phase A (pgvector + embeddings + job queue + backfill) live. This plan tackles the seven gaps you named — identity persistence, retrieval depth, dynamic prompting, reflection engine, response ranking, compression layer, and the resulting UX shift — in the order that compounds fastest.

Each phase is independently shippable. After each one the chat should *measurably* feel less generic.

---

## Phase 1 — Hybrid + temporal retrieval (the unlock)

Rewrite `supabase/functions/my-ai-chat/retrieval.ts` to use the embeddings already in the database.

For each user turn:
1. Embed the user message (`gemini-embedding-001`, same as `embed-row`).
2. Run kNN (`<=>` cosine) per corpus: `belief_nodes`, `journal_entries` (summary || body), `artifact_claims`, `knowledge_entities`, `my_ai_messages` (assistant only).
3. Score each candidate:
   `0.55*semantic + 0.20*recency_decay(half_life=60d) + 0.15*confidence_or_isCore + 0.10*keyword_overlap`
4. Pull a **temporal slice** for any belief that hits: latest 2 rows from `belief_versions` so the prompt sees the trajectory ("earlier you said X → now you say Y").
5. Pull **tension slice**: any `belief_tensions` where either side is semantically close to the turn — surfaces contradictions instead of hiding them.
6. Pack into the same `[belief:uuid]` / `[journal:uuid]` bracket format the prompt already cites.

Outcome: replies start naming specific past beliefs and transitions instead of paraphrasing the last sentence.

---

## Phase 2 — Identity persistence + compression layer

The `profiles.identity_summary` field exists but is thin and rarely updated. Replace it with a structured living document.

New table `user_cognitive_state` (one row per user):
- `worldview_summary` (markdown, ~800 tokens) — current operating worldview
- `evolution_summary` (markdown) — "began with X → moved to Y → now reframing as Z"
- `recurring_themes` (text[])
- `unresolved_tensions` (text[])
- `current_season` (text, e.g. "reframing manifestation vs surrender")
- `voice_signature` (text) — how the user talks: vocabulary, cadence, recurring metaphors
- `core_frameworks` (jsonb) — named mental models the user uses
- `updated_at`, `version`

This block is **always** injected at the top of every chat prompt, before retrieval results. That's how "infinite memory" gets faked cheaply.

New edge function `cognitive-sweep` (cron, nightly per active user):
- Pull last 7 days of new beliefs, journals, artifact_claims, assistant messages
- Pull existing `user_cognitive_state`
- Single Gemini Pro call: "Update this state. What changed? What evolved? What new tensions? Keep the voice."
- Write the new version, archive the old one in `user_cognitive_state_versions`
- Also re-cluster journals + run existing `framework-detect-tensions` in the same sweep

---

## Phase 3 — Layered dynamic system prompt

Replace the monolithic prompt in `systemPrompt.ts` with a builder that assembles 6 layers per turn:

1. **Identity layer** — `user_cognitive_state.worldview_summary` + `voice_signature`
2. **Evolution layer** — `evolution_summary` + `current_season`
3. **Retrieval layer** — bracket-tagged context pack from Phase 1
4. **Tension layer** — open `belief_tensions` adjacent to this turn
5. **Anti-generic layer** — explicit "Do not paraphrase. Do not mirror. Reference specific bracket-tagged rows by what they say, not their existence. Name transitions when you see them."
6. **Output contract** — existing JSON `{reply, citations}` shape

Keep the journal-companion variant; it gets the same layers but a softer anti-generic instruction.

---

## Phase 4 — Response ranking

In `my-ai-chat/index.ts`, after Phase 3 is live:

1. Generate **3 candidates in parallel** (same prompt, temperature 0.4 / 0.7 / 0.9).
2. Send all three + the user message + a compact context summary to a single Gemini 2.5 Flash "judge" call with a rubric:
   - specificity (names actual rows?)
   - continuity (references evolution?)
   - non-genericness (avoids "you've been on a journey" filler?)
   - voice match (sounds like the user's `voice_signature`?)
   - emotional resonance
3. Return the winner. Store loser scores in a new `my_ai_message_candidates` table so we can later fine-tune the rubric.

Added latency: ~1.5s. Worth it.

---

## Phase 5 — UI: surface the continuity

Frontend changes in `src/pages/journal/NewJournalEntryPage.tsx` and `src/pages/myai/MyAiPage.tsx`:

- Render the `citations` array under each AI bubble as small clickable chips ("from belief: manifestation reframe", "from journal: 3 weeks ago"). Already partially stored, just not shown.
- Add a tiny "memory" indicator on the composer when the assistant pulled in temporal/tension context — a quiet signal that it's actually thinking across time.
- Add a "What does my AI think it knows about me?" view that renders the current `user_cognitive_state` — so you can see and correct the model the system is operating from.

---

## Technical notes

- **No new providers.** Gemini-only stays. Lovable AI Gateway already gives us 2.5 Flash + Pro + embedding-001. Adding OpenAI/Claude in parallel is a Phase 6 question, not now.
- **No new vector DB.** pgvector + HNSW is enough for years at this corpus size.
- **Cron via existing `pg_cron` + `pg_net`** pattern already used for `embed-row`.
- **Schema changes**: `user_cognitive_state`, `user_cognitive_state_versions`, `my_ai_message_candidates`. RLS = own-user only.
- **Cost guardrail**: cognitive-sweep skips users with zero new content that day.

---

## Suggested ship order

1. Phase 1 alone — ships in one pass, immediately changes how replies feel.
2. Phase 2 + 3 together — they only make sense as a pair (state must exist for the prompt layers to use it).
3. Phase 4 — only after 1–3 prove the floor is high enough that ranking matters.
4. Phase 5 — anytime after Phase 2.

Want me to start with **Phase 1 only** and ship it before deciding on the rest? Or commit to Phases 1–3 as one block?
