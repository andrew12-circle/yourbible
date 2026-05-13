# YouTube Artifact Flow Redesign (Comparison + Proposed Better Flow)

## Goal
Turn long-form YouTube content into a guided **study workflow** (understand → evaluate → decide), rather than only an ingest-and-analyze pipeline.

## Current Flow (as implemented)

### Upload / Ingest
1. User opens `NewArtifactPage` and chooses **YouTube** mode.
2. User pastes URL and creates an `artifacts` row with `status: "fetching"`.
3. App invokes `framework-fetch-transcript`.
4. Function fetches transcript/metadata and then invokes `framework-analyze`.
5. User is navigated immediately to artifact detail page.

Implementation references:
- `src/pages/framework/NewArtifactPage.tsx`
- `supabase/functions/framework-fetch-transcript/index.ts`
- `supabase/functions/framework-analyze/index.ts`

### Detail / Consumption
On `ArtifactDetailPage`, the user gets:
- transcript panel (searchable, segmented text),
- extracted claims,
- entities,
- teachings.

This is powerful, but interaction is mostly "read extracted output" vs. "step through a deliberate decision process".

Implementation references:
- `src/pages/framework/ArtifactDetailPage.tsx`
- `src/components/framework/TranscriptPanel.tsx`
- `src/components/framework/ArtifactEntitiesPanel.tsx`
- `src/components/framework/TeachingsPanel.tsx`

## Gaps in Current UX (from deep-study perspective)
1. **No explicit section/chapter study path** for a 2-hour video.
2. **Claim cards are output-oriented**, not decision-oriented.
3. **Evaluation state is thin** (accept/reject/unsure with rationale is not first-class across every segment).
4. **Weak "thinking trace"**: hard to replay how/why the user changed their mind.
5. **Final synthesis is fragmented**: no strong "what I now believe" wrap-up artifact.

## Proposed Better Flow: "Study Hall for Video"

## 1) Stage-based pipeline in UI
Replace a single detail screen feel with clear stages:
1. **Prepare** (ingest + cleanup transcript)
2. **Map** (auto-build sections + pivotal claims)
3. **Examine** (segment-by-segment analysis)
4. **Conclude** (belief update summary)

This can be presented as a compact progress rail at top of detail page.

## 2) Primary layout: 3-pane Study Hall
- **Left pane:** Section/claim map (ordered by video timeline)
- **Center pane:** Transcript + synced video playback
- **Right pane:** Evaluation workspace + journal + AI lenses

Core behavior:
- click section/claim → seek player to timestamp,
- auto-highlight transcript window,
- open evaluation card for that exact segment.

## 3) Make each segment a "Decision Unit"
Each section/claim should support:
- Stance: `accept | reject | uncertain | partial`
- Confidence (1–5)
- Why (free-text rationale)
- Evidence for / against
- Personal implication ("if true, what changes?")

This turns passive notes into an auditable reasoning trail.

## 4) Add AI lenses as guided actions (not generic chat)
Per segment buttons:
- **Steelman** (best possible version)
- **Red-team** (strongest critique)
- **Assumptions** (hidden premises)
- **Verify/Falsify plan** (what evidence would settle this)
- **Scripture cross-check** (if relevant to faith framework)

Output should save directly into the segment notebook.

## 5) End with a required synthesis checkpoint
Before marking artifact "completed", prompt user to finalize:
- Top 3 accepted ideas
- Top 3 rejected ideas
- Open tensions to revisit
- Updated belief statements
- Next sources to compare

Save as a durable "Conclusion Snapshot" tied to artifact.

## Minimal Implementation Path (incremental)

### Phase 1 (fastest UX win)
- Add section map data model (timeline chapters).
- Add segment-level stance + confidence + rationale fields.
- Add "jump to timestamp" from every claim/section card.

### Phase 2
- Add right-pane "AI lens" actions per segment.
- Persist lens outputs as structured notes.

### Phase 3
- Add final synthesis workflow + export/share view.

## Data Model Additions (conceptual)
- `artifact_sections` (artifact_id, start_sec, end_sec, title, summary, order_index)
- `artifact_section_evaluations` (section_id, stance, confidence, rationale, evidence_for, evidence_against)
- `artifact_conclusions` (artifact_id, accepted_json, rejected_json, tensions_json, belief_updates_json)

## Why this is better
- Scales to long podcasts without cognitive overload.
- Helps users **decide**, not just consume.
- Creates a reusable "belief formation record" for future reflection.
- Aligns tightly with your stated use case: study deeply, compare against existing worldview, accept/reject thoughtfully.
