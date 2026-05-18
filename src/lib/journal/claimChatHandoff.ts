/** Session handoff: artifact claim → new chat journal (read once before bootstrap). */
export const CLAIM_CHAT_HANDOFF_KEY = "yb_journal_claim_handoff_v1";

export type ClaimChatHandoff = {
  claimId: string;
  artifactId: string;
  /** Optional transcript snippet shown on the artifact card ("Source in transcript"). */
  transcriptExcerpt?: string;
};

export function setClaimChatHandoff(payload: ClaimChatHandoff): void {
  try {
    sessionStorage.setItem(CLAIM_CHAT_HANDOFF_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Returns payload and removes key so Strict Mode / remounts do not reuse it. */
export function readAndClearClaimChatHandoff(): ClaimChatHandoff | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CLAIM_CHAT_HANDOFF_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(CLAIM_CHAT_HANDOFF_KEY);
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    const claimId = typeof o.claimId === "string" ? o.claimId.trim() : "";
    const artifactId = typeof o.artifactId === "string" ? o.artifactId.trim() : "";
    if (!/^[0-9a-f-]{36}$/i.test(claimId) || !/^[0-9a-f-]{36}$/i.test(artifactId)) return null;
    const transcriptExcerpt =
      typeof o.transcriptExcerpt === "string" && o.transcriptExcerpt.trim()
        ? o.transcriptExcerpt.trim().slice(0, 4000)
        : undefined;
    return { claimId, artifactId, transcriptExcerpt };
  } catch {
    return null;
  }
}
