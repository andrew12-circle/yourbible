import { supabase } from "@/integrations/supabase/client";

export interface DayOneImportResult {
  ok: boolean;
  journal_id?: string | null;
  journal_ids?: string[];
  entries_imported?: number;
  entries_skipped?: number;
  photos_imported?: number;
  photos_skipped?: number;
  partial?: boolean;
  message?: string | null;
  total_entries?: number;
}

function friendlyImportError(functionName: string, err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/failed to send a request|Failed to fetch|NetworkError/i.test(msg)) {
    return `${functionName} is unavailable. Deploy the import-day-one edge function and try again. (${msg})`;
  }
  if (/Bucket not found|artifact-uploads/i.test(msg)) {
    return `Storage is not set up for imports. Apply migrations for the artifact-uploads bucket. (${msg})`;
  }
  return msg;
}

export async function uploadDayOneExportFile(userId: string, file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  const ext = lower.endsWith(".zip") ? ".zip" : ".json";
  const path = `${userId}/${crypto.randomUUID()}${ext}`;
  const { error } = await supabase.storage.from("artifact-uploads").upload(path, file, {
    upsert: false,
    contentType: file.type || (ext === ".zip" ? "application/zip" : "application/json"),
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function importDayOneExport(options: {
  storagePath: string;
  targetJournalId?: string | null;
  journalName?: string | null;
}): Promise<DayOneImportResult> {
  const { data, error } = await supabase.functions.invoke("import-day-one", {
    body: {
      storage_path: options.storagePath,
      target_journal_id: options.targetJournalId ?? null,
      journal_name: options.journalName ?? null,
    },
  });
  if (error) throw new Error(friendlyImportError("import-day-one", error));
  if (data && typeof data === "object" && "error" in data && typeof (data as { error?: unknown }).error === "string") {
    throw new Error((data as { error: string }).error);
  }
  return data as DayOneImportResult;
}
