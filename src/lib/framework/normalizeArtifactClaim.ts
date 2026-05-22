/** Coerce Supabase/JSON claim fields into safe shapes for UI rendering. */

export type ScriptureRef = { ref: string; note?: string | null };

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function asScriptureRefs(value: unknown): ScriptureRef[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => item != null && typeof item === "object")
    .map((item) => {
      const ref = typeof item.ref === "string" ? item.ref : "";
      if (!ref) return null;
      const note = typeof item.note === "string" ? item.note : item.note == null ? null : undefined;
      return { ref, note: note ?? undefined };
    })
    .filter((item): item is ScriptureRef => item != null);
}

export type NormalizableArtifactClaim = {
  doctrine_tags?: unknown;
  bias_flags?: unknown;
  scripture_supports?: unknown;
  scripture_challenges?: unknown;
};

/** Normalize array/json fields so `.map` never throws on artifact claim rows. */
export function normalizeArtifactClaimArrays<T extends NormalizableArtifactClaim>(claim: T) {
  return {
    ...claim,
    doctrine_tags: asStringArray(claim.doctrine_tags),
    bias_flags: asStringArray(claim.bias_flags),
    scripture_supports: asScriptureRefs(claim.scripture_supports),
    scripture_challenges: asScriptureRefs(claim.scripture_challenges),
  };
}
