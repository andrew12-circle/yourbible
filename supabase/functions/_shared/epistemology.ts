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

export const EVIDENCE_KINDS = [
  "scripture",
  "tradition",
  "experience",
  "scholarship",
  "inference",
] as const;

export const EVIDENCE_STRENGTHS = ["direct", "indirect", "inferential", "speculative"] as const;

export const ALTERNATIVE_STANCES = ["supports", "neutral", "opposes"] as const;

export const CONFIDENCE_AXIS_LEVELS = ["weak", "moderate", "strong"] as const;

export const SCHOLARLY_CONSENSUS_LEVELS = ["minority", "mixed", "majority"] as const;

export const SPECULATION_LEVELS = ["low", "medium", "high"] as const;

export const RELATIONSHIP_LINK_KINDS = ["doctrine", "scripture", "theme", "belief"] as const;

export const EPISTEMOLOGY_PROMPT_BLOCK = `
4. For each claim, also fill epistemology (belief-mapping layers — populate ALL v2 fields when the claim warrants them):
   v1 fields:
   - claim_types: 1–4 tags from ONLY: ${CLAIM_TYPES.join(", ")}
   - confidence_level: exactly one of ${CONFIDENCE_LEVELS.join(", ")} (legacy single-axis summary)
   - hermeneutics.reasoning_bridge: 1–3 sentences on how the speaker likely got from text/experience to this claim
   - hermeneutics.assumptions: 0–4 unstated assumptions
   - hermeneutics.potential_weaknesses: 0–4 gentle weaknesses (logical leaps, proof-texting, cultural bias)
   - fruits: 1–5 short labels for what this belief tends to produce in a hearer
   - suggested_actions: 1–4 from ONLY: ${SUGGESTED_ACTIONS.join(", ")}
   v2 fields (belief-mapping engine):
   - claim_breakdown: { core: one-sentence core thesis, supporting: 0–4 explicit sub-claims, implied: 0–4 implied sub-claims, speculative: 0–3 extensions beyond what was stated }
   - evidence: { items: 2–6 entries with label (e.g. "Genesis 1", "ANE cosmology"), kind (${EVIDENCE_KINDS.join("|")}), strength (${EVIDENCE_STRENGTHS.join("|")}), optional note }
   - alternative_views: 2–5 named interpretive frameworks with name, 1–2 sentence summary, stance (${ALTERNATIVE_STANCES.join("|")}) relative to THIS claim
   - framework_impact: { if_accepted: 2–5 downstream shifts, if_rejected: 2–5 what stays intact }
   - confidence_axes: { scriptural/historical: weak|moderate|strong, scholarly_consensus: minority|mixed|majority, speculation: low|medium|high }
   - questions_raised: 3–6 open research questions a thoughtful hearer would ask
   - relationship_links: 3–8 links with label + kind (${RELATIONSHIP_LINK_KINDS.join("|")}) connecting this claim to doctrines, scriptures, themes, or beliefs`;

const CLAIM_TYPE_SET = new Set<string>(CLAIM_TYPES);
const CONFIDENCE_SET = new Set<string>(CONFIDENCE_LEVELS);
const ACTION_SET = new Set<string>(SUGGESTED_ACTIONS);
const EVIDENCE_KIND_SET = new Set<string>(EVIDENCE_KINDS);
const EVIDENCE_STRENGTH_SET = new Set<string>(EVIDENCE_STRENGTHS);
const ALTERNATIVE_STANCE_SET = new Set<string>(ALTERNATIVE_STANCES);
const CONFIDENCE_AXIS_SET = new Set<string>(CONFIDENCE_AXIS_LEVELS);
const SCHOLARLY_CONSENSUS_SET = new Set<string>(SCHOLARLY_CONSENSUS_LEVELS);
const SPECULATION_LEVEL_SET = new Set<string>(SPECULATION_LEVELS);
const RELATIONSHIP_LINK_KIND_SET = new Set<string>(RELATIONSHIP_LINK_KINDS);

function sanitizeStringList(raw: unknown, maxItems: number, maxLen: number): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().slice(0, maxLen))
    .slice(0, maxItems);
  return items.length ? items : undefined;
}

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
  claim_breakdown?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  alternative_views?: Record<string, unknown>[];
  framework_impact?: Record<string, unknown>;
  confidence_axes?: Record<string, unknown>;
  questions_raised?: string[];
  relationship_links?: Record<string, unknown>[];
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
    const assumptions = sanitizeStringList(h.assumptions, 8, 400);
    const weaknesses = sanitizeStringList(h.potential_weaknesses, 8, 400);
    if (assumptions) herm.assumptions = assumptions;
    if (weaknesses) herm.potential_weaknesses = weaknesses;
    if (Object.keys(herm).length) out.hermeneutics = herm;
  }

  const fruits = sanitizeStringList(o.fruits, 12, 80);
  if (fruits) out.fruits = fruits;

  if (Array.isArray(o.suggested_actions)) {
    const actions = o.suggested_actions
      .filter((a): a is string => typeof a === "string" && ACTION_SET.has(a))
      .slice(0, 6);
    if (actions.length) out.suggested_actions = actions;
  }

  if (o.claim_breakdown && typeof o.claim_breakdown === "object") {
    const b = o.claim_breakdown as Record<string, unknown>;
    if (typeof b.core === "string" && b.core.trim()) {
      const breakdown: Record<string, unknown> = { core: b.core.trim().slice(0, 400) };
      const supporting = sanitizeStringList(b.supporting, 6, 300);
      const implied = sanitizeStringList(b.implied, 6, 300);
      const speculative = sanitizeStringList(b.speculative, 4, 300);
      if (supporting) breakdown.supporting = supporting;
      if (implied) breakdown.implied = implied;
      if (speculative) breakdown.speculative = speculative;
      out.claim_breakdown = breakdown;
    }
  }

  if (o.evidence && typeof o.evidence === "object") {
    const ev = o.evidence as Record<string, unknown>;
    if (Array.isArray(ev.items)) {
      const items: Record<string, unknown>[] = [];
      for (const item of ev.items) {
        if (!item || typeof item !== "object") continue;
        const row = item as Record<string, unknown>;
        if (typeof row.label !== "string" || !row.label.trim()) continue;
        if (typeof row.kind !== "string" || !EVIDENCE_KIND_SET.has(row.kind)) continue;
        if (typeof row.strength !== "string" || !EVIDENCE_STRENGTH_SET.has(row.strength)) continue;
        const parsed: Record<string, unknown> = {
          label: row.label.trim().slice(0, 200),
          kind: row.kind,
          strength: row.strength,
        };
        if (typeof row.note === "string" && row.note.trim()) {
          parsed.note = row.note.trim().slice(0, 400);
        }
        items.push(parsed);
        if (items.length >= 8) break;
      }
      if (items.length) out.evidence = { items };
    }
  }

  if (Array.isArray(o.alternative_views)) {
    const views: Record<string, unknown>[] = [];
    for (const item of o.alternative_views) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.name !== "string" || !row.name.trim()) continue;
      if (typeof row.summary !== "string" || !row.summary.trim()) continue;
      if (typeof row.stance !== "string" || !ALTERNATIVE_STANCE_SET.has(row.stance)) continue;
      views.push({
        name: row.name.trim().slice(0, 120),
        summary: row.summary.trim().slice(0, 500),
        stance: row.stance,
      });
      if (views.length >= 6) break;
    }
    if (views.length) out.alternative_views = views;
  }

  if (o.framework_impact && typeof o.framework_impact === "object") {
    const fi = o.framework_impact as Record<string, unknown>;
    const impact: Record<string, unknown> = {};
    const ifAccepted = sanitizeStringList(fi.if_accepted, 6, 300);
    const ifRejected = sanitizeStringList(fi.if_rejected, 6, 300);
    if (ifAccepted) impact.if_accepted = ifAccepted;
    if (ifRejected) impact.if_rejected = ifRejected;
    if (Object.keys(impact).length) out.framework_impact = impact;
  }

  if (o.confidence_axes && typeof o.confidence_axes === "object") {
    const ca = o.confidence_axes as Record<string, unknown>;
    const axes: Record<string, unknown> = {};
    if (typeof ca.scriptural === "string" && CONFIDENCE_AXIS_SET.has(ca.scriptural)) {
      axes.scriptural = ca.scriptural;
    }
    if (typeof ca.historical === "string" && CONFIDENCE_AXIS_SET.has(ca.historical)) {
      axes.historical = ca.historical;
    }
    if (typeof ca.scholarly_consensus === "string" && SCHOLARLY_CONSENSUS_SET.has(ca.scholarly_consensus)) {
      axes.scholarly_consensus = ca.scholarly_consensus;
    }
    if (typeof ca.speculation === "string" && SPECULATION_LEVEL_SET.has(ca.speculation)) {
      axes.speculation = ca.speculation;
    }
    if (Object.keys(axes).length) out.confidence_axes = axes;
  }

  const questionsRaised = sanitizeStringList(o.questions_raised, 8, 400);
  if (questionsRaised) out.questions_raised = questionsRaised;

  if (Array.isArray(o.relationship_links)) {
    const links: Record<string, unknown>[] = [];
    for (const item of o.relationship_links) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      if (typeof row.label !== "string" || !row.label.trim()) continue;
      if (typeof row.kind !== "string" || !RELATIONSHIP_LINK_KIND_SET.has(row.kind)) continue;
      const link: Record<string, unknown> = {
        label: row.label.trim().slice(0, 120),
        kind: row.kind,
      };
      if (typeof row.entity_id === "string" && row.entity_id.trim()) {
        link.entity_id = row.entity_id.trim().slice(0, 64);
      }
      links.push(link);
      if (links.length >= 12) break;
    }
    if (links.length) out.relationship_links = links;
  }

  return Object.keys(out).length > 0 ? out : null;
}
