## Goal

Build a **structured spiritual reflection and discernment system** centered on dreams — not a "dream interpretation" app.

The experience should help users capture, reflect, compare with Scripture, and track patterns over time so they can discern wisely instead of reacting emotionally.

## Product posture (non-negotiable)

- Do **not** present mystical or fortune-teller style outputs.
- Do **not** claim certainty (e.g., never say "God said…").
- Frame AI as:
  - reflection guide,
  - pattern recognizer,
  - Scripture-alignment assistant,
  - spiritual journaling companion.

Preferred language:
- "This resembles biblical patterns found in…"
- "Consider praying through…"
- "Possible themes to discern over time…"

## System architecture

### 1) Dream Capture Layer (frictionless)

Primary moment: immediately upon waking.

Inputs:
- Voice recording
- Typed journal
- Half-awake quick capture mode
- Timestamp
- Sleep quality
- Emotion selector
- Intensity slider

Capture prompts:
- "What happened first?"
- "Who appeared?"
- "What emotions stood out?"
- "What symbols repeated?"
- "Did anything feel holy, fearful, chaotic, peaceful, or urgent?"

UX principle:
- Capture must feel as fast as voice notes + minimal taps.
- Reflection can deepen later; capture speed is priority at wake-up.

### 2) Symbol Extraction Engine

AI parses dream entries into structured signals:
- people
- places
- colors
- numbers
- animals
- weather
- actions
- repeated imagery
- emotional tone

Canonical output shape:

```json
{
  "symbols": ["ocean", "father", "storm", "door", "white clothing"],
  "emotions": ["fear", "urgency", "peace at end"],
  "themes": ["transition", "warning", "authority"]
}
```

Then link results to:
- related Scriptures,
- prior journal entries,
- recurring symbol patterns,
- trusted teachings/resources.

### 3) Discernment Framework (guided flow)

The app should guide users through a repeatable process:

#### Step 1 — Source check
Questions:
- Did this produce fear or clarity?
- Condemnation or conviction?
- Confusion or direction?

Scriptural anchors:
- James 3
- 1 Corinthians 14:33
- Galatians 5

#### Step 2 — Symbol review
Questions:
- Which symbols stood out most?
- Personal symbols or biblical symbols?
- Have these appeared before?

#### Step 3 — Archetype analysis
Common archetypes:
- father, child, stranger, king, enemy, mentor
- house, vehicle, storm, ladder, snake

Purpose:
- Pattern recognition, not occult interpretation.

#### Step 4 — Scripture alignment
Guardrail:
- Never output absolute divine claims.
- Always map themes to biblical patterns and passages.

#### Step 5 — Reflection
Prompts:
- What may require prayer?
- What action, if any, should be taken?
- Is there anything to surrender?
- Does this align with wisdom and Scripture?

#### Step 6 — Outcome tracking
Follow-up prompts (later):
- Did anything related happen?
- Was insight gained?
- Did circumstances change?
- Was this symbolic, emotional, spiritual, or unresolved stress?

## Long-term advantage

Over months/years, the system should surface:
- recurring themes,
- emotional cycles,
- spiritual struggles,
- repeated symbols,
- answered prayers,
- major life transitions,
- fear loops,
- breakthrough periods.

This becomes:
- a spiritual timeline,
- an emotional intelligence system,
- a theological growth map,
- a subconscious reflection engine.

## Core feature ideas

### Dream Connections
- "Similar dream from 7 months ago"
- Auto-linked entries by symbol/theme/archetype overlap.

### Scripture Correlation
- Theme pathways tied to biblical dream/discernment narratives:
  - Joseph
  - Daniel
  - Jacob
  - Pharaoh
  - Peter
  - warnings, visions, discernment motifs

### AI Reflection Mode
- Ask clarifying questions
- Surface patterns
- Highlight contradictions/tensions
- Suggest Scripture
- Support discernment, not conclusions

### Night Watch Mode (before sleep)
- Prayer prompts
- Worship audio
- Scripture meditation
- Gratitude and release-anxiety journaling

## UX direction

Most Bible apps are passive reading.

This system should feel like **active spiritual formation** through:
- intentional reflection,
- scriptural grounding,
- longitudinal pattern awareness.

## Positioning statement

Not:
- "A dream interpretation app"

Instead:
- "A spiritual operating system for reflection, discernment, growth, and biblical alignment."
