import type { SupabaseClient } from "@supabase/supabase-js";

export type ClaimResearchEventType =
  | "opened"
  | "brief_loaded"
  | "brief_cached"
  | "message_sent"
  | "verdict_set"
  | "reflect_saved"
  | "full_report_opened";

export async function logClaimResearchEvent(
  supabase: SupabaseClient,
  input: {
    userId: string;
    claimId: string;
    artifactId?: string | null;
    eventType: ClaimResearchEventType;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await supabase.from("claim_research_events").insert({
    user_id: input.userId,
    artifact_claim_id: input.claimId,
    artifact_id: input.artifactId ?? null,
    event_type: input.eventType,
    metadata: (input.metadata ?? {}) as Record<string, unknown>,
  });
}
