# Epistemology engine

Layered belief decomposition under Framework claim cards.

## v1 (shipped)

| Layer | Storage | UI |
|-------|---------|-----|
| Claim type classification | `artifact_claims.epistemology.claim_types[]` | Badges on card |
| Confidence meter | `epistemology.confidence_level` | Meter + label (fallback when no axes) |
| Hermeneutics | `epistemology.hermeneutics` | Collapsible “How they got here” |
| Fruit analysis | `epistemology.fruits[]` | “What this belief tends to produce” |
| Action layer | `epistemology.suggested_actions[]` | Guide chips (non-destructive) |

## v2 (shipped — belief-mapping engine)

Populated by `framework-analyze` on **re-analyze**. Existing claims keep v1-only JSON until re-analyzed.

| Layer | Storage | UI section |
|-------|---------|------------|
| Claim breakdown | `claim_breakdown` | Core / supporting / implied / speculative |
| Evidence cited | `evidence.items[]` | Label + kind + strength |
| Alternative interpretations | `alternative_views[]` | Named frameworks + stance |
| Framework impact | `framework_impact` | If accepted / if rejected |
| Multi-axis confidence | `confidence_axes` | Scriptural, historical, consensus, speculation |
| Questions raised | `questions_raised[]` | Open research paths |
| Relationship map | `relationship_links[]` | Doctrine / scripture / theme / belief links |

Card spine (within **Belief mapping** panel): Breakdown → Evidence → Alternatives → Impact → Confidence → Hermeneutics → Fruits → Questions → Map → Actions.

Research chat / journal handoff includes all populated layers via `formatEpistemologyMarkdownSections`.

## v3 (deferred)

- **Belief graph origin tracking** — wire `relationship_links.entity_id` to graph nodes.
- **Internal contradiction detection** — cross-claim query across artifacts.
- **Emotional vulnerability detection** — tie to user profile / journal signals.
- **Timeline replay** — how a claim entered the framework over time.

## Schema

```json
{
  "claim_types": ["interpretation", "speculation"],
  "confidence_level": "weakly_supported",
  "confidence_axes": {
    "scriptural": "weak",
    "historical": "moderate",
    "scholarly_consensus": "minority",
    "speculation": "high"
  },
  "claim_breakdown": {
    "core": "...",
    "supporting": ["..."],
    "implied": ["..."],
    "speculative": ["..."]
  },
  "evidence": {
    "items": [
      { "label": "Genesis 1", "kind": "scripture", "strength": "indirect", "note": "..." }
    ]
  },
  "alternative_views": [
    { "name": "Traditional view", "summary": "...", "stance": "opposes" }
  ],
  "framework_impact": {
    "if_accepted": ["..."],
    "if_rejected": ["..."]
  },
  "questions_raised": ["..."],
  "relationship_links": [{ "label": "Human Origins", "kind": "doctrine" }],
  "hermeneutics": {
    "reasoning_bridge": "...",
    "assumptions": ["..."],
    "potential_weaknesses": ["..."]
  },
  "fruits": ["fear", "hope"],
  "suggested_actions": ["hold_loosely", "test_over_time"]
}
```

Column: `artifact_claims.epistemology` (JSONB, default `{}`).
