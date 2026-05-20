export type ClaimVerdict = "keep" | "reject" | "updated" | "defer";

export const CLAIM_VERDICT_LABELS: Record<ClaimVerdict, string> = {
  keep: "Keep",
  reject: "Reject",
  updated: "Updated",
  defer: "Deferred",
};

export function formatClaimVerdict(verdict: string | null | undefined): string {
  if (!verdict?.trim()) return "";
  const key = verdict.trim() as ClaimVerdict;
  return CLAIM_VERDICT_LABELS[key] ?? verdict;
}

export function isDeferredVerdict(verdict: string | null | undefined): boolean {
  return verdict === "defer";
}
