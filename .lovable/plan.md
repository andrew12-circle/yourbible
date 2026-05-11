# Quick Belief Capture

Add a one-tap "I believe…" capture surface so you can drop a statement (e.g. while watching a webinar) and have it automatically slotted into the right place in your belief framework — expanding the architecture instead of forcing you to navigate it.

## What you'll see

- A new **"+ Add belief"** button on the Beliefs list page (and on the Framework dashboard).
- It opens a small composer with one big textarea: *"I believe…"* plus an optional source field (e.g. "Webinar — John Doe, May 11").
- When you press **Save**, AI classifies it in the background:
  - picks the **layer** (Foundations / Life / Mechanics / Emotional)
  - picks/creates a **topic** (e.g. "Prayer", "Holy Spirit")
  - cleans the **statement** into a tight first-person sentence
  - suggests a **confidence %** and a few **tags**
  - looks for **related existing beliefs** and flags **agree / refines / conflicts**
- You see a confirmation card with the AI's classification and a **"Looks right / Edit / Discard"** choice. On accept, it saves to `belief_nodes` and (if there's a conflict) to `belief_tensions`. If the related belief already exists, a `belief_link` is created instead of a duplicate.

## Where it lives

- Floating composer accessible from:
  - `/framework` dashboard (primary CTA tile)
  - `/framework/beliefs` (header button)
  - Home screen Beliefs app icon long-press → "Add belief" (optional, only if trivial)

## Technical Details

**New edge function: `framework-classify-belief`**
- Input: `{ raw_text: string, source?: string }`
- Pulls user's existing beliefs (id, layer, topic, statement) for context.
- Calls Lovable AI Gateway (`google/gemini-2.5-pro`) with a tool-call schema:
  ```
  { layer, topic, statement, confidence, tags[],
    related: [{ belief_id, relation: "agree"|"refines"|"conflicts" }],
    is_duplicate_of: belief_id | null }
  ```
- Returns the classification to the client; no DB writes inside the function (keeps user in control).

**Client save flow**
- On accept, insert into `belief_nodes` with `is_core=false`, `layer`, `topic`, `statement`, `answer=raw_text`, `confidence`, `tags`.
- Insert a `belief_sources` row with `source_type='quick_capture'` (and `label = source` if provided).
- For each `related` item: insert a `belief_links` row (`a_id=new`, `b_id=existing`, `relation`).
- For each `conflicts` item: insert a `belief_tensions` row (`a_id=new`, `b_id=existing`, severity from AI, status `open`).
- If `is_duplicate_of` is set, skip insert and instead show "This looks like an existing belief — open it?" with a link.

**New files**
- `supabase/functions/framework-classify-belief/index.ts`
- `src/components/framework/QuickBeliefDialog.tsx` (composer + AI review card, reused everywhere)
- `src/lib/framework/quickBelief.ts` (calls the function, handles accept/save)

**Edited files**
- `src/pages/framework/BeliefsListPage.tsx` — header "+ Add belief" button
- `src/pages/framework/FrameworkDashboard.tsx` — primary "Capture a belief" tile

**No schema changes.** All existing tables (`belief_nodes`, `belief_links`, `belief_tensions`, `belief_sources`) already support this.

## Out of scope
- Voice-to-text capture (can add later by reusing `framework-transcribe-audio`).
- Bulk import from a webinar transcript (already covered by the Artifacts flow).
- Re-running classification on existing beliefs.
