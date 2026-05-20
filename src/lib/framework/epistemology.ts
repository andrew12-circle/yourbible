/** Epistemology engine v1 — claim-level belief decomposition (populated by framework-analyze). */

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

export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CONFIDENCE_LEVELS = [
  "strong_consensus",
  "moderately_supported",
  "weakly_supported",
  "highly_debated",
  "speculative",
  "no_direct_basis",
] as const;

export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

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

export type SuggestedAction = (typeof SUGGESTED_ACTIONS)[number];

export interface ClaimHermeneutics {
  reasoning_bridge?: string;
  assumptions?: string[];
  potential_weaknesses?: string[];
}

export interface ClaimEpistemology {
  claim_types?: ClaimType[];
  confidence_level?: ConfidenceLevel | null;
  hermeneutics?: ClaimHermeneutics;
  fruits?: string[];
  suggested_actions?: SuggestedAction[];
}

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  doctrine: "Doctrine",
  interpretation: "Interpretation",
  personal_revelation: "Personal revelation",
  testimony: "Testimony",
  speculation: "Speculation",
  fear_based_warning: "Fear-based warning",
  metaphor: "Metaphor",
  tradition: "Tradition",
  mystical_claim: "Mystical claim",
  direct_scripture: "Direct scripture",
  extra_biblical_theory: "Extra-biblical theory",
};

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  strong_consensus: "Strong consensus",
  moderately_supported: "Moderately supported",
  weakly_supported: "Weakly supported",
  highly_debated: "Highly debated",
  speculative: "Speculative",
  no_direct_basis: "No direct basis",
};

/** 0–5 for visual meter (higher = more epistemically grounded in mainstream terms). */
export const CONFIDENCE_METER: Record<ConfidenceLevel, number> = {
  strong_consensus: 5,
  moderately_supported: 4,
  weakly_supported: 3,
  highly_debated: 2,
  speculative: 1,
  no_direct_basis: 0,
};

export const ACTION_LABELS: Record<SuggestedAction, string> = {
  study_deeper: "Study deeper",
  hold_loosely: "Hold loosely",
  test_over_time: "Test over time",
  seek_opposing_views: "Seek opposing views",
  pray: "Pray",
  compare_denominations: "Compare denominations",
  journal: "Journal",
  reject: "Reject",
  suspend_judgment: "Suspend judgment",
};

const CLAIM_TYPE_SET = new Set<string>(CLAIM_TYPES);
const CONFIDENCE_SET = new Set<string>(CONFIDENCE_LEVELS);
const ACTION_SET = new Set<string>(SUGGESTED_ACTIONS);

export function parseClaimEpistemology(raw: unknown): ClaimEpistemology | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: ClaimEpistemology = {};

  if (Array.isArray(o.claim_types)) {
    const types = o.claim_types
      .filter((t): t is ClaimType => typeof t === "string" && CLAIM_TYPE_SET.has(t));
    if (types.length) out.claim_types = types;
  }

  if (typeof o.confidence_level === "string" && CONFIDENCE_SET.has(o.confidence_level)) {
    out.confidence_level = o.confidence_level as ConfidenceLevel;
  }

  if (o.hermeneutics && typeof o.hermeneutics === "object") {
    const h = o.hermeneutics as Record<string, unknown>;
    const herm: ClaimHermeneutics = {};
    if (typeof h.reasoning_bridge === "string" && h.reasoning_bridge.trim()) {
      herm.reasoning_bridge = h.reasoning_bridge.trim().slice(0, 1200);
    }
    if (Array.isArray(h.assumptions)) {
      herm.assumptions = h.assumptions
        .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
        .map((a) => a.trim().slice(0, 400))
        .slice(0, 8);
    }
    if (Array.isArray(h.potential_weaknesses)) {
      herm.potential_weaknesses = h.potential_weaknesses
        .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
        .map((a) => a.trim().slice(0, 400))
        .slice(0, 8);
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
    const actions = o.suggested_actions.filter(
      (a): a is SuggestedAction => typeof a === "string" && ACTION_SET.has(a),
    );
    if (actions.length) out.suggested_actions = actions.slice(0, 6);
  }

  return hasEpistemologyContent(out) ? out : null;
}

export function hasEpistemologyContent(ep: ClaimEpistemology | null | undefined): boolean {
  if (!ep) return false;
  if (ep.claim_types?.length) return true;
  if (ep.confidence_level) return true;
  if (ep.hermeneutics?.reasoning_bridge) return true;
  if (ep.hermeneutics?.assumptions?.length) return true;
  if (ep.hermeneutics?.potential_weaknesses?.length) return true;
  if (ep.fruits?.length) return true;
  if (ep.suggested_actions?.length) return true;
  return false;
}

/** Instruction block appended to framework-analyze claim extraction prompts. */
export const EPISTEMOLOGY_PROMPT_BLOCK = `
4. For each claim, also fill epistemology (how the speaker arrived at this belief and how to engage it):
   - claim_types: 1–4 tags from ONLY: doctrine, interpretation, personal_revelation, testimony, speculation, fear_based_warning, metaphor, tradition, mystical_claim, direct_scripture, extra_biblical_theory (multi-tag OK)
   - confidence_level: exactly one of strong_consensus, moderately_supported, weakly_supported, highly_debated, speculative, no_direct_basis (how well the claim is supported by mainstream scripture/scholarship — NOT your opinion of truth)
   - hermeneutics.reasoning_bridge: 1–3 sentences on how the speaker likely got from text/experience to this claim (no preaching)
   - hermeneutics.assumptions: 0–4 unstated assumptions the argument relies on
   - hermeneutics.potential_weaknesses: 0–4 gentle weaknesses (logical leaps, proof-texting, cultural bias) — not insulting
   - fruits: 1–5 short labels for what this belief tends to produce in a hearer (e.g. peace, fear, responsibility, paranoia, freedom, condemnation, guilt, hope, control, shame)
   - suggested_actions: 1–4 from ONLY: study_deeper, hold_loosely, test_over_time, seek_opposing_views, pray, compare_denominations, journal, reject, suspend_judgment (non-destructive guidance for the user)`;
