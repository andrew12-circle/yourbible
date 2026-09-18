import { supabase } from "@/integrations/supabase/client";
import { useJournalVaultStore } from "@/stores/journalVaultStore";
import { journalCloudAiAllowed } from "./journalAiPolicy";
import { peekJournalDocument, journalSnapshotRow } from "./journalDocuments";

export const PRIVATE_JOURNAL_AI_MESSAGE = "Cloud AI is disabled for encrypted journals and private vents. Your recording or sketch can still be saved without transcription.";

/** Check metadata only; private text must never be sent merely to discover its policy. */
export async function canUseJournalCloudAi(entryId?: string, expectedUserId?: string): Promise<boolean> {
  const epoch = useJournalVaultStore.getState().lockEpoch;
  if (!journalCloudAiAllowed({})) return false;
  const { data: auth, error: authError } = await supabase.auth.getSession();
  if (authError) throw authError;
  const userId = auth.session?.user.id;
  if (!userId || (expectedUserId && userId !== expectedUserId)) return false;
  const currentAllowed = () => {
    if (useJournalVaultStore.getState().lockEpoch !== epoch || !journalCloudAiAllowed({})) return false;
    const local = entryId && peekJournalDocument(userId, entryId);
    return !local || journalCloudAiAllowed(journalSnapshotRow(local.current()));
  };
  if (!currentAllowed()) return false;
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .select("journal_e2e_enabled").eq("user_id", userId).maybeSingle();
  if (profileError) throw profileError;
  if (profile?.journal_e2e_enabled) return false;
  if (entryId) {
    const { data: entry, error } = await supabase.from("journal_entries")
      .select("id,user_id,journal_id,entry_kind,e2e_encrypted").eq("id", entryId).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!entry || entry.user_id !== userId || !journalCloudAiAllowed(entry)) return false;
    if (entry.journal_id) {
      const { data: journal, error: journalError } = await supabase.from("journals")
        .select("e2e_required").eq("id", entry.journal_id).eq("user_id", userId).maybeSingle();
      if (journalError) throw journalError;
      if (!journal || journal.e2e_required) return false;
    }
  }
  const { data: after, error: afterError } = await supabase.auth.getSession();
  if (afterError) throw afterError;
  return after.session?.user.id === userId && currentAllowed();
}

export async function requireJournalCloudAi(entryId?: string, userId?: string): Promise<void> {
  if (!(await canUseJournalCloudAi(entryId, userId))) throw new Error(PRIVATE_JOURNAL_AI_MESSAGE);
}

export async function requireJournalVideoCloudAi(storagePath: string, expectedUserId?: string): Promise<string> {
  const { data: video, error } = await supabase.from("journal_videos").select("entry_id,user_id")
    .eq("storage_path", storagePath).maybeSingle();
  if (error) throw error;
  if (!video || (expectedUserId && video.user_id !== expectedUserId)) throw new Error("Video ownership could not be verified.");
  await requireJournalCloudAi(video.entry_id, video.user_id);
  return video.entry_id;
}
