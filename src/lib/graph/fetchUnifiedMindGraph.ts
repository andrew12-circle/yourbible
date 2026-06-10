import { supabase } from "@/integrations/supabase/client";
import type { UnifiedMindGraphInput } from "@/lib/graph/unifiedMindGraph";

export async function fetchUnifiedMindGraph(
  userId: string,
  options?: { journalId?: string | null },
): Promise<UnifiedMindGraphInput> {
  let entryQ = supabase
    .from("journal_entries")
    .select("id,title,body,summary,belief_id,verse_ref,journal_id")
    .eq("user_id", userId)
    .or("entry_kind.is.null,entry_kind.neq.vent")
    .order("entry_at_ts", { ascending: false })
    .limit(600);
  if (options?.journalId) entryQ = entryQ.eq("journal_id", options.journalId);

  const [
    { data: entries },
    { data: beliefs },
    { data: artifacts },
    { data: entities },
    { data: journalLinks },
    { data: beliefLinks },
    { data: tensions },
    { data: beliefSources },
    { data: claims },
    { data: scriptures },
    { data: entityMentions },
  ] = await Promise.all([
    entryQ,
    supabase.from("belief_nodes").select("id,statement,topic").eq("user_id", userId),
    supabase.from("artifacts").select("id,title,kind").eq("user_id", userId).limit(400),
    supabase.from("knowledge_entities").select("id,title,kind").eq("user_id", userId).limit(300),
    supabase.from("journal_entry_links").select("entry_id,target_kind,target_ref").eq("user_id", userId),
    supabase.from("belief_links").select("a_id,b_id,relation").eq("user_id", userId),
    supabase.from("belief_tensions").select("a_id,b_id").eq("user_id", userId).eq("status", "open"),
    supabase.from("belief_sources").select("belief_id,artifact_id").eq("user_id", userId),
    supabase
      .from("artifact_claims")
      .select("id,claim,artifact_id,matched_belief_id")
      .eq("user_id", userId)
      .not("matched_belief_id", "is", null)
      .limit(500),
    supabase.from("belief_scriptures").select("belief_id,ref").eq("user_id", userId),
    supabase
      .from("entity_mentions")
      .select("entity_id,journal_entry_id,artifact_id,belief_id")
      .eq("user_id", userId)
      .limit(800),
  ]);

  return {
    entries: (entries ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      body: e.body ?? "",
      summary: e.summary,
      belief_id: e.belief_id,
      verse_ref: e.verse_ref,
    })),
    beliefs: beliefs ?? [],
    artifacts: artifacts ?? [],
    entities: entities ?? [],
    journalLinks: (journalLinks ?? []).map((l) => ({
      entry_id: l.entry_id,
      target_kind: l.target_kind,
      target_ref: (l.target_ref ?? {}) as Record<string, unknown>,
    })),
    beliefLinks: beliefLinks ?? [],
    tensions: tensions ?? [],
    beliefSources: (beliefSources ?? []).filter((s) => s.artifact_id),
    claims: claims ?? [],
    scriptures: scriptures ?? [],
    entityMentions: entityMentions ?? [],
  };
}
