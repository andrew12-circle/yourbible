/** Epistemology engine — claim-level belief decomposition (populated by framework-analyze). */

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

export const EVIDENCE_KINDS = [
  "scripture",
  "tradition",
  "experience",
  "scholarship",
  "inference",
] as const;

export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const EVIDENCE_STRENGTHS = ["direct", "indirect", "inferential", "speculative"] as const;

export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];

export const ALTERNATIVE_STANCES = ["supports", "neutral", "opposes"] as const;

export type AlternativeStance = (typeof ALTERNATIVE_STANCES)[number];

export const CONFIDENCE_AXIS_LEVELS = ["weak", "moderate", "strong"] as const;

export type ConfidenceAxisLevel = (typeof CONFIDENCE_AXIS_LEVELS)[number];

export const SCHOLARLY_CONSENSUS_LEVELS = ["minority", "mixed", "majority"] as const;

export type ScholarlyConsensusLevel = (typeof SCHOLARLY_CONSENSUS_LEVELS)[number];

export const SPECULATION_LEVELS = ["low", "medium", "high"] as const;

export type SpeculationLevel = (typeof SPECULATION_LEVELS)[number];

export const RELATIONSHIP_LINK_KINDS = ["doctrine", "scripture", "theme", "belief"] as const;

export type RelationshipLinkKind = (typeof RELATIONSHIP_LINK_KINDS)[number];

export interface ClaimHermeneutics {
  reasoning_bridge?: string;
  assumptions?: string[];
  potential_weaknesses?: string[];
}

export interface ClaimBreakdown {
  core: string;
  supporting?: string[];
  implied?: string[];
  speculative?: string[];
}

export interface ClaimEvidenceItem {
  label: string;
  kind: EvidenceKind;
  strength: EvidenceStrength;
  note?: string;
}

export interface ClaimAlternativeView {
  name: string;
  summary: string;
  stance: AlternativeStance;
}

export interface ClaimFrameworkImpact {
  if_accepted?: string[];
  if_rejected?: string[];
}

export interface ClaimConfidenceAxes {
  scriptural?: ConfidenceAxisLevel;
  historical?: ConfidenceAxisLevel;
  scholarly_consensus?: ScholarlyConsensusLevel;
  speculation?: SpeculationLevel;
}

export interface ClaimRelationshipLink {
  label: string;
  kind: RelationshipLinkKind;
  entity_id?: string;
}

export interface ClaimEpistemology {
  claim_types?: ClaimType[];
  confidence_level?: ConfidenceLevel | null;
  hermeneutics?: ClaimHermeneutics;
  fruits?: string[];
  suggested_actions?: SuggestedAction[];
  /** v2 — decompose one headline into load-bearing sub-claims. */
  claim_breakdown?: ClaimBreakdown;
  /** v2 — why the speaker believes this (with strength tags). */
  evidence?: { items: ClaimEvidenceItem[] };
  /** v2 — named interpretive frameworks in tension with this claim. */
  alternative_views?: ClaimAlternativeView[];
  /** v2 — downstream effects if accepted vs rejected. */
  framework_impact?: ClaimFrameworkImpact;
  /** v2 — multi-axis confidence (replaces single meter when present). */
  confidence_axes?: ClaimConfidenceAxes;
  /** v2 — open research questions this claim surfaces. */
  questions_raised?: string[];
  /** v2 — links to doctrines, scriptures, themes, beliefs. */
  relationship_links?: ClaimRelationshipLink[];
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

export const EVIDENCE_KIND_LABELS: Record<EvidenceKind, string> = {
  scripture: "Scripture",
  tradition: "Tradition",
  experience: "Experience",
  scholarship: "Scholarship",
  inference: "Inference",
};

export const EVIDENCE_STRENGTH_LABELS: Record<EvidenceStrength, string> = {
  direct: "Direct",
  indirect: "Indirect",
  inferential: "Inferential",
  speculative: "Speculative",
};

export const ALTERNATIVE_STANCE_LABELS: Record<AlternativeStance, string> = {
  supports: "Supports",
  neutral: "Neutral",
  opposes: "Opposes",
};

export const CONFIDENCE_AXIS_LABELS: Record<ConfidenceAxisLevel, string> = {
  weak: "Weak",
  moderate: "Moderate",
  strong: "Strong",
};

export const SCHOLARLY_CONSENSUS_LABELS: Record<ScholarlyConsensusLevel, string> = {
  minority: "Minority view",
  mixed: "Mixed",
  majority: "Majority view",
};

export const SPECULATION_LEVEL_LABELS: Record<SpeculationLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const RELATIONSHIP_LINK_KIND_LABELS: Record<RelationshipLinkKind, string> = {
  doctrine: "Doctrine",
  scripture: "Scripture",
  theme: "Theme",
  belief: "Belief",
};

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

function parseStringList(raw: unknown, maxItems: number, maxLen: number): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items = raw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().slice(0, maxLen))
    .slice(0, maxItems);
  return items.length ? items : undefined;
}

function parseClaimBreakdown(raw: unknown): ClaimBreakdown | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.core !== "string" || !o.core.trim()) return undefined;
  const breakdown: ClaimBreakdown = { core: o.core.trim().slice(0, 400) };
  const supporting = parseStringList(o.supporting, 6, 300);
  const implied = parseStringList(o.implied, 6, 300);
  const speculative = parseStringList(o.speculative, 4, 300);
  if (supporting) breakdown.supporting = supporting;
  if (implied) breakdown.implied = implied;
  if (speculative) breakdown.speculative = speculative;
  return breakdown;
}

function parseEvidence(raw: unknown): { items: ClaimEvidenceItem[] } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const source = Array.isArray(o.items) ? o.items : Array.isArray(raw) ? raw : null;
  if (!source) return undefined;
  const items: ClaimEvidenceItem[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.label !== "string" || !row.label.trim()) continue;
    if (typeof row.kind !== "string" || !EVIDENCE_KIND_SET.has(row.kind)) continue;
    if (typeof row.strength !== "string" || !EVIDENCE_STRENGTH_SET.has(row.strength)) continue;
    const parsed: ClaimEvidenceItem = {
      label: row.label.trim().slice(0, 200),
      kind: row.kind as EvidenceKind,
      strength: row.strength as EvidenceStrength,
    };
    if (typeof row.note === "string" && row.note.trim()) {
      parsed.note = row.note.trim().slice(0, 400);
    }
    items.push(parsed);
    if (items.length >= 8) break;
  }
  return items.length ? { items } : undefined;
}

function parseAlternativeViews(raw: unknown): ClaimAlternativeView[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const views: ClaimAlternativeView[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.name !== "string" || !row.name.trim()) continue;
    if (typeof row.summary !== "string" || !row.summary.trim()) continue;
    if (typeof row.stance !== "string" || !ALTERNATIVE_STANCE_SET.has(row.stance)) continue;
    views.push({
      name: row.name.trim().slice(0, 120),
      summary: row.summary.trim().slice(0, 500),
      stance: row.stance as AlternativeStance,
    });
    if (views.length >= 6) break;
  }
  return views.length ? views : undefined;
}

function parseFrameworkImpact(raw: unknown): ClaimFrameworkImpact | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const impact: ClaimFrameworkImpact = {};
  const ifAccepted = parseStringList(o.if_accepted, 6, 300);
  const ifRejected = parseStringList(o.if_rejected, 6, 300);
  if (ifAccepted) impact.if_accepted = ifAccepted;
  if (ifRejected) impact.if_rejected = ifRejected;
  return impact.if_accepted?.length || impact.if_rejected?.length ? impact : undefined;
}

function parseConfidenceAxes(raw: unknown): ClaimConfidenceAxes | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const axes: ClaimConfidenceAxes = {};
  if (typeof o.scriptural === "string" && CONFIDENCE_AXIS_SET.has(o.scriptural)) {
    axes.scriptural = o.scriptural as ConfidenceAxisLevel;
  }
  if (typeof o.historical === "string" && CONFIDENCE_AXIS_SET.has(o.historical)) {
    axes.historical = o.historical as ConfidenceAxisLevel;
  }
  if (typeof o.scholarly_consensus === "string" && SCHOLARLY_CONSENSUS_SET.has(o.scholarly_consensus)) {
    axes.scholarly_consensus = o.scholarly_consensus as ScholarlyConsensusLevel;
  }
  if (typeof o.speculation === "string" && SPECULATION_LEVEL_SET.has(o.speculation)) {
    axes.speculation = o.speculation as SpeculationLevel;
  }
  return Object.keys(axes).length ? axes : undefined;
}

function parseRelationshipLinks(raw: unknown): ClaimRelationshipLink[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const links: ClaimRelationshipLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.label !== "string" || !row.label.trim()) continue;
    if (typeof row.kind !== "string" || !RELATIONSHIP_LINK_KIND_SET.has(row.kind)) continue;
    const link: ClaimRelationshipLink = {
      label: row.label.trim().slice(0, 120),
      kind: row.kind as RelationshipLinkKind,
    };
    if (typeof row.entity_id === "string" && row.entity_id.trim()) {
      link.entity_id = row.entity_id.trim().slice(0, 64);
    }
    links.push(link);
    if (links.length >= 12) break;
  }
  return links.length ? links : undefined;
}

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
    const assumptions = parseStringList(h.assumptions, 8, 400);
    const weaknesses = parseStringList(h.potential_weaknesses, 8, 400);
    if (assumptions) herm.assumptions = assumptions;
    if (weaknesses) herm.potential_weaknesses = weaknesses;
    if (Object.keys(herm).length) out.hermeneutics = herm;
  }

  const fruits = parseStringList(o.fruits, 12, 80);
  if (fruits) out.fruits = fruits;

  if (Array.isArray(o.suggested_actions)) {
    const actions = o.suggested_actions.filter(
      (a): a is SuggestedAction => typeof a === "string" && ACTION_SET.has(a),
    );
    if (actions.length) out.suggested_actions = actions.slice(0, 6);
  }

  const breakdown = parseClaimBreakdown(o.claim_breakdown);
  if (breakdown) out.claim_breakdown = breakdown;

  const evidence = parseEvidence(o.evidence);
  if (evidence) out.evidence = evidence;

  const alternativeViews = parseAlternativeViews(o.alternative_views);
  if (alternativeViews) out.alternative_views = alternativeViews;

  const frameworkImpact = parseFrameworkImpact(o.framework_impact);
  if (frameworkImpact) out.framework_impact = frameworkImpact;

  const confidenceAxes = parseConfidenceAxes(o.confidence_axes);
  if (confidenceAxes) out.confidence_axes = confidenceAxes;

  const questionsRaised = parseStringList(o.questions_raised, 8, 400);
  if (questionsRaised) out.questions_raised = questionsRaised;

  const relationshipLinks = parseRelationshipLinks(o.relationship_links);
  if (relationshipLinks) out.relationship_links = relationshipLinks;

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
  if (ep.claim_breakdown?.core) return true;
  if (ep.evidence?.items.length) return true;
  if (ep.alternative_views?.length) return true;
  if (ep.framework_impact?.if_accepted?.length) return true;
  if (ep.framework_impact?.if_rejected?.length) return true;
  if (ep.confidence_axes && Object.keys(ep.confidence_axes).length) return true;
  if (ep.questions_raised?.length) return true;
  if (ep.relationship_links?.length) return true;
  return false;
}

/** Markdown lines for claim research handoff (excludes duplicate scripture grid). */
export function formatEpistemologyMarkdownSections(ep: ClaimEpistemology): string[] {
  const lines: string[] = [];

  if (ep.claim_breakdown?.core) {
    lines.push("## Claim breakdown");
    lines.push(`**Core:** ${ep.claim_breakdown.core}`);
    if (ep.claim_breakdown.supporting?.length) {
      lines.push("");
      lines.push("**Supporting claims:**");
      for (const s of ep.claim_breakdown.supporting) lines.push(`- ${s}`);
    }
    if (ep.claim_breakdown.implied?.length) {
      lines.push("");
      lines.push("**Implied claims:**");
      for (const s of ep.claim_breakdown.implied) lines.push(`- ${s}`);
    }
    if (ep.claim_breakdown.speculative?.length) {
      lines.push("");
      lines.push("**Speculative extensions:**");
      for (const s of ep.claim_breakdown.speculative) lines.push(`- ${s}`);
    }
    lines.push("");
  }

  if (ep.evidence?.items.length) {
    lines.push("## Evidence cited");
    for (const item of ep.evidence.items) {
      const note = item.note ? ` — ${item.note}` : "";
      lines.push(
        `- **${item.label}** (${EVIDENCE_KIND_LABELS[item.kind]}, ${EVIDENCE_STRENGTH_LABELS[item.strength]})${note}`,
      );
    }
    lines.push("");
  }

  if (ep.alternative_views?.length) {
    lines.push("## Alternative interpretations");
    for (const view of ep.alternative_views) {
      lines.push(`- **${view.name}** (${ALTERNATIVE_STANCE_LABELS[view.stance]}): ${view.summary}`);
    }
    lines.push("");
  }

  if (ep.framework_impact?.if_accepted?.length || ep.framework_impact?.if_rejected?.length) {
    lines.push("## Framework impact");
    if (ep.framework_impact.if_accepted?.length) {
      lines.push("**If accepted:**");
      for (const s of ep.framework_impact.if_accepted) lines.push(`- ${s}`);
      lines.push("");
    }
    if (ep.framework_impact.if_rejected?.length) {
      lines.push("**If rejected:**");
      for (const s of ep.framework_impact.if_rejected) lines.push(`- ${s}`);
      lines.push("");
    }
  }

  if (ep.confidence_axes && Object.keys(ep.confidence_axes).length) {
    lines.push("## Confidence");
    const axes = ep.confidence_axes;
    if (axes.scriptural) lines.push(`- Scriptural support: ${CONFIDENCE_AXIS_LABELS[axes.scriptural]}`);
    if (axes.historical) lines.push(`- Historical support: ${CONFIDENCE_AXIS_LABELS[axes.historical]}`);
    if (axes.scholarly_consensus) {
      lines.push(`- Scholarly consensus: ${SCHOLARLY_CONSENSUS_LABELS[axes.scholarly_consensus]}`);
    }
    if (axes.speculation) lines.push(`- Speculation level: ${SPECULATION_LEVEL_LABELS[axes.speculation]}`);
    lines.push("");
  } else if (ep.confidence_level) {
    lines.push("## Confidence");
    lines.push(`- ${CONFIDENCE_LABELS[ep.confidence_level]}`);
    lines.push("");
  }

  if (ep.claim_types?.length) {
    lines.push("## Claim types");
    for (const t of ep.claim_types) lines.push(`- ${CLAIM_TYPE_LABELS[t]}`);
    lines.push("");
  }

  if (ep.hermeneutics?.reasoning_bridge || ep.hermeneutics?.assumptions?.length || ep.hermeneutics?.potential_weaknesses?.length) {
    lines.push("## How they got here");
    if (ep.hermeneutics.reasoning_bridge) lines.push(ep.hermeneutics.reasoning_bridge);
    if (ep.hermeneutics.assumptions?.length) {
      lines.push("");
      lines.push("**Assumptions:**");
      for (const a of ep.hermeneutics.assumptions) lines.push(`- ${a}`);
    }
    if (ep.hermeneutics.potential_weaknesses?.length) {
      lines.push("");
      lines.push("**Potential weaknesses:**");
      for (const w of ep.hermeneutics.potential_weaknesses) lines.push(`- ${w}`);
    }
    lines.push("");
  }

  if (ep.fruits?.length) {
    lines.push("## What this belief tends to produce");
    lines.push(ep.fruits.join(", "));
    lines.push("");
  }

  if (ep.questions_raised?.length) {
    lines.push("## Questions this raises");
    for (const q of ep.questions_raised) lines.push(`- ${q}`);
    lines.push("");
  }

  if (ep.relationship_links?.length) {
    lines.push("## Relationship map");
    for (const link of ep.relationship_links) {
      lines.push(`- ${RELATIONSHIP_LINK_KIND_LABELS[link.kind]}: ${link.label}`);
    }
    lines.push("");
  }

  if (ep.suggested_actions?.length) {
    lines.push("## Suggested engagement");
    for (const a of ep.suggested_actions) lines.push(`- ${ACTION_LABELS[a]}`);
    lines.push("");
  }

  return lines;
}

/** Instruction block appended to framework-analyze claim extraction prompts. */
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
   - alternative_views: 2–5 named interpretive frameworks (e.g. "Traditional Christian view", "Gap theory") with name, 1–2 sentence summary, stance (${ALTERNATIVE_STANCES.join("|")}) relative to THIS claim
   - framework_impact: { if_accepted: 2–5 downstream shifts, if_rejected: 2–5 what stays intact }
   - confidence_axes: { scriptural/historical: weak|moderate|strong, scholarly_consensus: minority|mixed|majority, speculation: low|medium|high }
   - questions_raised: 3–6 open research questions a thoughtful hearer would ask
   - relationship_links: 3–8 links with label + kind (${RELATIONSHIP_LINK_KINDS.join("|")}) connecting this claim to doctrines, scriptures, themes, or beliefs`;
