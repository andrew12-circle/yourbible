import { supabase } from "@/integrations/supabase/client";
import type { StorageUsageSummary } from "@/lib/storage/storageMeter";

function parseUsageRow(raw: unknown): StorageUsageSummary {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const breakdownRaw = o.breakdown && typeof o.breakdown === "object"
    ? (o.breakdown as Record<string, unknown>)
    : {};
  return {
    journal_bytes: Number(o.journal_bytes) || 0,
    artifacts_bytes: Number(o.artifacts_bytes) || 0,
    total_bytes: Number(o.total_bytes) || 0,
    breakdown: {
      journal_photos_bytes: Number(breakdownRaw.journal_photos_bytes) || 0,
      journal_videos_bytes: Number(breakdownRaw.journal_videos_bytes) || 0,
      voice_memos_bytes: Number(breakdownRaw.voice_memos_bytes) || 0,
      artifact_uploads_bytes: Number(breakdownRaw.artifact_uploads_bytes) || 0,
    },
  };
}

export async function fetchStorageUsage(): Promise<StorageUsageSummary> {
  const { data, error } = await supabase.rpc("get_my_storage_usage");
  if (error) throw error;
  return parseUsageRow(data);
}
