import { supabase } from "@/integrations/supabase/client";

export type SketchTranscriptionResult =
  | { ok: true; body: string; text?: string; skipped?: boolean }
  | { ok: false; error: string };

/** Calls the edge function that OCRs a journal sketch and appends text to the entry body. */
export async function transcribeJournalSketch(opts: {
  entryId: string;
  storagePath: string;
}): Promise<SketchTranscriptionResult> {
  const { data, error } = await supabase.functions.invoke("journal-sketch-to-text", {
    body: { entry_id: opts.entryId, storage_path: opts.storagePath },
  });
  if (error) return { ok: false, error: error.message };
  const d = data as Record<string, unknown> | null;
  if (d && typeof d.error === "string") return { ok: false, error: d.error };
  if (!d || d.ok !== true || typeof d.body !== "string") {
    return { ok: false, error: "Unexpected response from sketch transcription" };
  }
  return {
    ok: true,
    body: d.body,
    ...(typeof d.text === "string" ? { text: d.text } : {}),
    ...(d.skipped === true ? { skipped: true } : {}),
  };
}
