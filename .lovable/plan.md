## Where you actually are (this is the good news)

You already have most of Phase 1 of your own architecture shipped — better than 95% of "AI apps":

| Your layer | What exists today |
|---|---|
| Foundation model | `my-ai-chat` edge function on Gemini 2.5 Flash (single provider) |
| Raw conversation storage | `my_ai_chats`, `my_ai_messages`, `chat_threads`/`chat_messages`, `ai_conversations` |
| Identity layer | `belief_nodes` (layer, confidence, is_core), `belief_versions`, `belief_links`, `belief_tensions`, `belief_scriptures`, `belief_sources`, `profiles.identity_summary` |
| Journal corpus | `journal_entries` (+ kinds: dream/testimony/vent/chat/listening), `journal_entry_scores`, `journal_mirror_reports`, `entity_mentions`, `knowledge_entities` |
| Influences/artifacts | `artifacts`, `artifact_claims`, `artifact_moments` |
| Retrieval | `retrieval.ts` builds a context pack from identity + beliefs + journals + artifacts + entities + chat history, ranks by token overlap, shrinks to 12K chars |
| System prompt | Citation contract, "no fabrication" guard rails, vent-privacy filter |
| Reflective synthesis (partial) | `journal-score-entry`, `framework-weekly-digest`, `journal-mirror`, `framework-detect-tensions` |

**What you do NOT have yet, in your own terms:**

1. **Semantic memory** — no embeddings, no vector index. Retrieval is keyword/token-overlap only. This is the single biggest leverage gap.
2. **Memory weighting** — every belief/journal is equal; no recency/emotional/confidence weighting at retrieval time.
3. **Context compression** — you truncate, you don't summarize. Long journals get clipped instead of distilled.
4. **Model orchestration** — Gemini-only, hardcoded. No "skeptic vs synthesizer vs theologian" routing.
5. **Contradiction surfacing in chat** — `belief_tensions` exists but the chat doesn't proactively say "this conflicts with [belief X]".
6. **Temporal understanding** — `belief_versions` is captured but not used in retrieval ("you used to believe X, then shifted Y").
7. **Confidence/source attribution in replies** — citations exist, but no confidence score, no "I'm 60% sure based on 3 journals from Oct".
8. **Multi-agent loop** — single prompt, single call.

---

## Proposed build order

### Phase A — Semantic memory + weighted retrieval (the unlock)

This is what turns your current "good RAG" into "feels like it knows me."

1. Enable `pgvector` in the database.
2. Add `embedding vector(768)` columns to: `belief_nodes`, `journal_entries`, `artifact_claims`, `knowledge_entities`, `my_ai_messages` (assistant turns only, for self-reference).
3. New edge function `embed-row` — generates embeddings with Gemini `text-embedding-004` (free in Lovable AI). Trigger on insert/update of the above tables via Supabase triggers calling a queue table `embedding_jobs`, processed by `embed-row` (avoids inline blocking).
4. Backfill script for existing rows.
5. Rewrite `retrieval.ts` as a hybrid retriever:
   - Embed the user's message
   - kNN search across each corpus with `<=>` (cosine)
   - Score = `0.55 * semantic + 0.20 * recency_decay + 0.15 * confidence + 0.10 * keyword_overlap`
   - Pull top N per corpus, dedupe, then run a final cross-encoder re-rank pass (Gemini `generateContent` with a "score relevance 0-10" mini-prompt on candidates) before composing the context block.
6. Add a `temporal` slice: when a belief has multiple `belief_versions`, surface the trajectory ("Oct: confidence 40, Dec: 75") in the context block so the model can reason about change.

### Phase B — Reflective synthesis loop + contradiction surfacing

Turn storage into intelligence.

1. New edge function `cognitive-sweep` — runs nightly (cron) per active user:
   - Re-cluster journals embedded in last 7 days; write/update `knowledge_entities` of kind `theme`
   - Detect new tensions: for each new/updated belief, run pairwise compare against existing core beliefs via `framework-detect-tensions`, insert into `belief_tensions`
   - Compress: any journal > 1500 chars older than 30 days gets a `summary` column populated (new column on `journal_entries.summary text`), retrieval prefers summary
   - Emit a `framework_digest` row weekly (already exists, just trigger it)
2. **Contradiction surfacing in chat:** modify `retrieval.ts` to also pull `belief_tensions` where either side is semantically close to the user's message. Add a "## Active tensions relevant to this question" section to the context block. The system prompt already says "do not invent" — extend it to "when retrieved tensions touch this question, surface them gently."
3. **Memory verification UI:** a "Memory" view per chat reply that shows which beliefs/journals/tensions were actually used (the `citations` array already supports this — just render it as an expandable footer under each AI bubble).

### Phase C — Multi-agent + multi-model orchestration

Only after A and B feel right.

1. Move from Gemini-only to **Lovable AI Gateway** (`createLovableAiGatewayProvider`). Lets you pick model per task without API key juggling: Gemini 2.5 Flash for chat, GPT-5 for synthesis/contradiction detection, Gemini 2.5 Pro for long-context weekly sweeps.
2. Split `my-ai-chat` into a router edge function that delegates to small specialized prompts:
   - `agent-journal-companion` — current journal/chat behavior (warm, one question, mirrors tone)
   - `agent-skeptic` — invoked on demand ("challenge me on this") with system prompt to stress-test the user's claim against their own beliefs + scripture
   - `agent-theologian` — for explicit doctrinal questions; weighted toward `belief_scriptures` + `artifact_claims`
   - `agent-curator` — runs inside `cognitive-sweep`, never user-facing, decides what to compress/promote
3. **Identity guardian guardrail:** before any belief is written/versioned from chat, route through a check that flags drift from `is_core = true` beliefs and requires user confirmation.

### What I'd skip / defer

- **Multiple providers in parallel for redundancy** — premature. Lovable AI Gateway already gives you provider flexibility without lock-in.
- **A standalone vector DB (Pinecone/Qdrant/Weaviate)** — pgvector + your existing Supabase scales to millions of rows for one user. Don't add infrastructure.
- **Whisper/Deepgram swap** — you already have `framework-transcribe-audio` and `journal-sketch-to-text` working.
- **Full Next.js rewrite** — your Vite + React + Supabase stack is the right one for this project. Ignore that part of the advice.

---

## Technical notes

- **Embeddings model:** `google/text-embedding-004` via Lovable AI Gateway — 768 dim, free tier, fits a `vector(768)` column with `ivfflat` index `WITH (lists = 100)`.
- **Recency decay:** `exp(-age_days / 90)` works well as a starting half-life for journals; longer for beliefs.
- **Context budget:** keep the 12K char cap but spend it differently — 30% identity, 25% top semantic matches, 20% active tensions, 15% recent chat, 10% temporal trajectory.
- **Privacy invariants to preserve:** vents stay excluded from retrieval everywhere; partner digest stays read-only; `belief_versions` is append-only.
- **What changes in the DB:** `pgvector` extension, `embedding` column on 5 tables, `embedding_jobs` queue table, `journal_entries.summary text nullable`, trigger functions. No breaking changes to existing rows.

---

## Recommended starting point

**Phase A, step 1–4 only** as the next concrete unit of work:
- Enable pgvector
- Add embedding columns + jobs queue
- Build `embed-row` edge function
- Backfill existing data

That alone takes your retrieval from "ranked by word overlap" to "ranked by meaning" — which is the gap between your current chat and the ChatGPT-feel you described. Phases B and C compound on top of that.

Want me to start with Phase A, or do you want to debate priorities first?