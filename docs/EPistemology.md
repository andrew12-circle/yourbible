# Epistemology engine

Layered belief decomposition under Framework claim cards. **v1** is live; **v2** items are deferred.

## v1 (shipped)

| Layer | Storage | UI |
|-------|---------|-----|
| Claim type classification | `artifact_claims.epistemology.claim_types[]` | Badges on card |
| Confidence meter | `epistemology.confidence_level` | Meter + label |
| Hermeneutics | `epistemology.hermeneutics` | Collapsible “How they got here” |
| Fruit analysis | `epistemology.fruits[]` | “What this belief tends to produce” |
| Action layer | `epistemology.suggested_actions[]` | Guide chips (non-destructive) |

Populated by `framework-analyze` (Gemini). **Re-analyze** an artifact to backfill; existing claims show empty epistemology until then.

## v2 (deferred)

- **Belief graph origin tracking** — deepen links to `belief_nodes` / influences (partial data exists today).
- **Internal contradiction detection** — cross-claim query across artifacts.
- **Emotional vulnerability detection** — tie to user profile / journal signals.
- **Timeline replay** — how a claim entered the framework over time.
- **Full counterweight expansion** — richer `scripture_challenges` + tension graph integration.

## Schema

```json
{
  "claim_types": ["interpretation", "speculation"],
  "confidence_level": "weakly_supported",
  "hermeneutics": {
    "reasoning_bridge": "...",
    "assumptions": ["..."],
    "potential_weaknesses": ["..."]
  },
  "fruits": ["fear", "paranoia"],
  "suggested_actions": ["hold_loosely", "test_over_time"]
}
```

Column: `artifact_claims.epistemology` (JSONB, default `{}`).
