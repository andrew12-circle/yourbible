/** Meta / housekeeping lines the model often emits for long YouTube intros — not study-worthy claims. */
const META_CLAIM_PATTERNS: RegExp[] = [
  /^the (episode|video|podcast|sermon|talk|message)\b/i,
  /^this (episode|video|podcast|sermon|talk)\b/i,
  /^the episode discusses\b/i,
  /^the video (also )?(contains|discusses|will address|is designed)\b/i,
  /^each individual section of the video\b/i,
  /^(viewers|listeners) are advised\b/i,
  /designed to build cumulatively/i,
  /covers a lot of topics/i,
  /\blong episode\b/i,
  /standalone book/i,
  /pause and rewatch/i,
  /deepest episodes?\b/i,
  /legitimately one of the deepest/i,
  /in this (episode|video|message) we (will|are going to)\b/i,
];

export function isMetaOrLowValueClaim(claim: string): boolean {
  const text = claim.trim();
  if (text.length < 15) return true;
  return META_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

export function filterSubstantiveClaims<T extends { claim: string }>(claims: T[]): T[] {
  const kept = claims.filter((c) => !isMetaOrLowValueClaim(c.claim));
  return kept.length > 0 ? kept : claims;
}
