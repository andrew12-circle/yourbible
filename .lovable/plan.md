## What you're really building

That ChatGPT thread isn't really a Bible-reader feature — it's a separate product layered on top of your Bible app: a **personal belief framework engine**. You feed it sermons, podcasts, songs, journal entries, and it compares them to *your stated beliefs* and to scripture, so you can decide what to absorb, adjust, or reject.

Below is a phased plan that fits this app's existing architecture (React + Lovable Cloud + Lovable AI Gateway) and starts small enough to be useful to you in week one, while leaving room for the full vision (visual mind-map, contradiction engine, influence tracking).

---

## Phase 1 — Foundations (the "what do I actually believe" layer)

Goal: get *your* framework on paper, structured, before any AI analysis happens.

1. New top-level section **"My Framework"** (sidebar entry next to the reader).
2. A guided **Belief Interview**, organized in the four layers from the chat:
   - Core Foundations (God, Jesus, Holy Spirit, Scripture)
   - Life Framework (Suffering, Prayer, Money, Relationships)
   - Spiritual Mechanics (Dreams, Angels, Prophecy, Discernment)
   - Emotional Reality (fears, formative voices, peace vs anxiety)
3. Each question stores a **Belief node** with: statement, your answer (free text), confidence (0–100 slider), supporting scriptures, sources/influences, tags, "I'm not sure" allowed.
4. "Resume later" — never force completion. Show progress per layer.

This alone is the highest-leverage step. Everything else plugs into these nodes.

---

## Phase 2 — Content Analyzer (the "should I keep this?" layer)

Goal: paste a YouTube/podcast/sermon link or transcript, get a structured comparison against your framework.

1. **Add Artifact** screen — accepts: pasted text, YouTube URL, podcast URL, voice memo, or a journal entry written in-app.
2. Backend (edge function using Lovable AI Gateway, default `google/gemini-2.5-pro`) extracts:
   - Core claims (1–2 sentences each)
   - Scripture references mentioned
   - Emotional tone (peace / fear / urgency / shame / hope)
   - Doctrine category tags
3. For each claim, second pass produces:
   - Supporting scriptures
   - Challenging scriptures
   - Match against *your* existing belief nodes: agree / disagree / new
   - Possible bias / fear-based framing flags
4. You review claim-by-claim with three buttons: **Keep**, **Reject**, **Update my belief** (opens the matching belief node pre-filled with a proposed edit and the source attached).

Output of this loop = your framework grows or sharpens with every piece of content, and the artifact gets archived with your verdict.

---

## Phase 3 — Belief Graph (the "see my worldview" layer)

Goal: the Obsidian-style mind map the chat described.

1. Each belief node already has tags + linked scriptures + linked artifacts → that's a graph.
2. Add a **Graph view** using `react-force-graph-2d` (lightweight, no native deps).
3. Node color = layer (foundations / life / mechanics / emotional). Edge types:
   - "supports", "contradicts", "influenced by source X", "linked scripture"
4. Click a node → side panel shows the belief, sources, scriptures, contradictions, confidence over time.

---

## Phase 4 — Contradiction & Influence Engine (the differentiators)

1. Whenever a belief is added/updated, run a background AI pass that compares its statement against every other belief in the same layer and flags **tensions** (not "wrong" — unresolved).
2. **Influence tracker**: each belief lists its sources (mentor, denomination, podcast host, scripture, personal experience). A small dashboard answers "who actually shaped this belief?".
3. **Confidence over time**: every edit is versioned, so the graph node can show a sparkline of how a belief has moved.

---

## Explicitly out of scope (for now)

- Sharing / multi-user / community features. This is a personal tool.
- Auto-transcribing audio in-app. Phase 2 starts with pasted transcripts + YouTube URLs (transcript fetched server-side); voice memos can come later.
- Any tone that says "this is what God says" — the AI is positioned as a *research assistant*, never an authority. All AI output is labeled and editable.

---

## Technical notes (for the implementer, not the user)

```text
DB tables (Lovable Cloud, all RLS to user_id):
  belief_nodes        id, user_id, layer, topic, statement, confidence, notes, created_at, updated_at
  belief_scriptures   belief_id, ref (e.g. "John 10:27"), role ('supports'|'challenges')
  belief_sources      belief_id, source_type, label, artifact_id?
  belief_versions     belief_id, snapshot jsonb, created_at  -- for confidence-over-time
  artifacts           id, user_id, kind ('youtube'|'podcast'|'text'|'voice'|'journal'),
                      url?, raw_text, status, created_at
  artifact_claims     id, artifact_id, claim, tone, scripture_refs jsonb, verdict ('keep'|'reject'|'updated'|null)
  belief_links        a_id, b_id, relation ('supports'|'contradicts'|'related')

Edge functions (use existing Lovable AI Gateway pattern from supabase/functions/verse-ai):
  framework-extract-claims     input: artifact text/url -> claims[]
  framework-analyze-claim      input: claim + user's belief snapshot -> support/challenge/match
  framework-detect-tensions    nightly or on-write per layer

Frontend routes:
  /framework                  dashboard: progress per layer, recent artifacts, open tensions
  /framework/interview/:layer guided question flow
  /framework/beliefs/:id      single belief detail (edit, history, linked artifacts)
  /framework/artifacts/new    add YouTube URL / paste text / journal
  /framework/artifacts/:id    claim-by-claim review
  /framework/graph            force-directed worldview map (Phase 3)

Reuse: existing Supabase client, AuthContext, Tailwind tokens, BookmarkDialog patterns.
New dep (Phase 3 only): react-force-graph-2d.
```

---

## What I'd build first if you say go

Just **Phase 1 + a minimal Phase 2** (paste-text artifacts only, no YouTube fetching yet). That gets you using the system within one build, and we can layer in the graph and YouTube/podcast ingestion after you've got 20–30 belief nodes seeded.
