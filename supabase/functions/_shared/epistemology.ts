/** Shared epistemology enums + sanitizer (framework-analyze). */

export const CLAIM_TYPES = [
  "doctrine",
  "interpretation",
  "personal_revelation",
  "testimony",
  "speculation",
  "fear_based_warning",
  "metaphor",
  "tradition",
  "mystical_claim",
  "direct_scripture",
  "extra_biblical_theory",
] as const;

export const CONFIDENCE_LEVELS = [
  "strong_consensus",
  "moderately_supported",
  "weakly_supported",
  "highly_debated",
  "speculative",
  "no_direct_basis",
] as const;

export const SUGGESTED_ACTIONS = [
  "study_deeper",
  "hold_loosely",
  "test_over_time",
  "seek_opposing_views",
  "pray",
  "compare_denominations",
  "journal",
  "reject",
  "suspend_judgment",
] as const;

export const EPISTEMOLOGY_PROMPT_BLOCK = `
4. For each claim, also fill epistemology (how the speaker arrived at this belief and how to engage it):
   - claim_types: 1–4 tags from ONLY: ${CLAIM_TYPES.join(", ")} (multi-tag OK)
   - confidence_level: exactly one of ${CONFIDENCE_LEVELS.join(", ")} (mainstream scripture/scholarship support — NOT your opinion of truth)
   - hermeneutics.reasoning_bridge: 1–3 sentences on how the speaker likely got from text/experience to this claim
   - hermeneutics.assumptions: 0–4 unstated assumptions
   - hermeneutics.potential_weaknesses: 0–4 gentle weaknesses (logical leaps, proof-texting, cultural bias)
   - fruits: 1–5 short labels for what this belief tends to produce (peace, fear, responsibility, paranoia, freedom, condemnation, etc.)
   - suggested_actions: 1–4 from ONLY: ${SUGGESTED_ACTIONS.join(", ")}`;

const CLAIM_TYPE_SET = new Set<string>(CLAIM_TYPES);
const CONFIDENCE_SET = new Set<string>(CONFIDENCE_LEVELS);
const ACTION_SET = new Set<string>(SUGGESTED_ACTIONS);

export interface ClaimEpistemologyOut {
  claim_types?: string[];
  confidence_level?: string | null;
  hermeneutics?: {
    reasoning_bridge?: string;
    assumptions?: string[];
    potential_weaknesses?: string[];
  };
  fruits?: string[];
  suggested_actions?: string[];
}

export function sanitizeEpistemology(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  if (Array.isArray(o.claim_types)) {
    const types = o.claim_types
      .filter((t): t is string => typeof t === "string" && CLAIM_TYPE_SET.has(t))
      .slice(0, 4);
    if (types.length) out.claim_types = types;
  }

  if (typeof o.confidence_level === "string" && CONFIDENCE_SET.has(o.confidence_level)) {
    out.confidence_level = o.confidence_level;
  }

  if (o.hermeneutics && typeof o.hermeneutics === "object") {
    const h = o.hermeneutics as Record<string, unknown>;
    const herm: Record<string, unknown> = {};
    if (typeof h.reasoning_bridge === "string" && h.reasoning_bridge.trim()) {
      herm.reasoning_bridge = h.reasoning_bridge.trim().slice(0, 1200);
    }
    if (Array.isArray(h.assumptions)) {
      const a = h.assumptions
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim().slice(0, 400))
        .slice(0, 8);
      if (a.length) herm.assumptions = a;
    }
    if (Array.isArray(h.potential_weaknesses)) {
      const w = h.potential_weaknesses
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .map((x) => x.trim().slice(0, 400))
        .slice(0, 8);
      if (w.length) herm.potential_weaknesses = w;
    }
    if (Object.keys(herm).length) out.hermeneutics = herm;
  }

  if (Array.isArray(o.fruits)) {
    const fruits = o.fruits
      .filter((f): f is string => typeof f === "string" && f.trim().length > 0)
      .map((f) => f.trim().slice(0, 80))
      .slice(0, 12);
    if (fruits.length) out.fruits = fruits;
  }

  if (Array.isArray(o.suggested_actions)) {
    const actions = o.suggested_actions
      .filter((a): a is string => typeof a === "string" && ACTION_SET.has(a))
      .slice(0, 6);
    if (actions.length) out.suggested_actions = actions;
  }

  return Object.keys(out).length > 0 ? out : null;
}
