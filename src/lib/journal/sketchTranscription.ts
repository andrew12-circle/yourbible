import { supabase } from "@/integrations/supabase/client";
import { shouldSuggestJournalTitle } from "@/lib/journal/entryDisplay";
import { suggestJournalEntryTitle } from "@/lib/journal/suggestTitle";
import { upsertEntrySketchPhoto } from "@/lib/journal/sketchPhotos";

export type SketchTranscriptionResult = {
  ok: boolean;
  body?: string;
  text?: string;
  title?: string;
  summary?: string;
  skipped?: boolean;
  error?: string;
};

/** True when the entry body already contains an AI sketch transcription block. */
export function entryBodyHasSketchTranscription(body: string | null | undefined): boolean {
  const s = body ?? "";
  return /<!-- sketch-tx:/.test(s) || /\*\*From your sketch\*\*/i.test(s);
}

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
    ...(typeof d.title === "string" && d.title.trim() ? { title: d.title.trim() } : {}),
    ...(typeof d.summary === "string" && d.summary.trim() ? { summary: d.summary.trim() } : {}),
    ...(d.skipped === true ? { skipped: true } : {}),
  };
}

/** Upload the canonical sketch PNG and run handwriting → text (and summary when configured). */
export async function upsertSketchAndTranscribe(
  userId: string,
  entryId: string,
  file: File,
): Promise<
  SketchTranscriptionResult & { storage_path: string; photo_id: string | null }
> {
  const { storage_path, photo_id } = await upsertEntrySketchPhoto(userId, entryId, file);
  const transcription = await transcribeJournalSketch({ entryId, storagePath: storage_path });
  const title = await ensureTitleAfterSketch(entryId, transcription);
  return {
    ...transcription,
    storage_path,
    photo_id,
    ...(title ? { title } : {}),
  };
}

async function ensureTitleAfterSketch(
  entryId: string,
  last: SketchTranscriptionResult | null,
): Promise<string | undefined> {
  if (last?.title?.trim()) return last.title.trim();
  if (!last?.ok) return undefined;
  const body = last.body ?? "";
  const summary = last.summary ?? null;
  if (!shouldSuggestJournalTitle(null, body, summary)) return undefined;
  const suggested = await suggestJournalEntryTitle({ entryId, body });
  return suggested.ok ? suggested.title : undefined;
}

/** Transcribe every sketch storage path for an entry (skips paths already in the body). */
export async function transcribeEntrySketchPaths(
  entryId: string,
  storagePaths: string[],
): Promise<{
  ok: boolean;
  error?: string;
  transcribed: number;
  title?: string;
  summary?: string;
  body?: string;
}> {
  let transcribed = 0;
  let lastError: string | undefined;
  let last: SketchTranscriptionResult | null = null;
  for (const storagePath of storagePaths) {
    const r = await transcribeJournalSketch({ entryId, storagePath });
    last = r;
    if (!r.ok) {
      lastError = r.error;
      break;
    }
    if (!r.skipped) transcribed += 1;
  }
  const title = await ensureTitleAfterSketch(entryId, last);
  return {
    ok: !lastError,
    error: lastError,
    transcribed,
    ...(last?.body ? { body: last.body } : {}),
    ...(last?.summary ? { summary: last.summary } : {}),
    ...(title ? { title } : last?.title ? { title: last.title } : {}),
  };
}
