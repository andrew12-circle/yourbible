/** Coerce Supabase/JSON claim fields into safe shapes for UI rendering. */
export type ScriptureRef = { ref: string; note?: string | null };
function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()))];
}
function asScriptureRefs(value: unknown): ScriptureRef[] {
  if (!Array.isArray(value)) return [];
  const refs: ScriptureRef[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const ref = typeof row.ref === "string" && row.ref.trim() ? row.ref.trim()
      : typeof row.reference === "string" ? row.reference.trim() : "";
    if (!ref || seen.has(ref.toLowerCase())) continue;
    const note = typeof row.note === "string" ? row.note.trim()
      : typeof row.relevance === "string" ? row.relevance.trim() : undefined;
    seen.add(ref.toLowerCase());
    refs.push({ ref, note: note || undefined });
  }
  return refs;
}
export type NormalizableArtifactClaim = {
  doctrine_tags?: unknown; bias_flags?: unknown; scripture_supports?: unknown; scripture_challenges?: unknown;
};
/** Normalize both current ref/note and legacy reference/relevance payloads. */
export function normalizeArtifactClaimArrays<T extends NormalizableArtifactClaim>(claim: T) {
  return { ...claim, doctrine_tags: asStringArray(claim.doctrine_tags), bias_flags: asStringArray(claim.bias_flags),
    scripture_supports: asScriptureRefs(claim.scripture_supports), scripture_challenges: asScriptureRefs(claim.scripture_challenges) };
}
