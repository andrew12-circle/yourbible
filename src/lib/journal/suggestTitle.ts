import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";

export type SuggestTitleResult =
  | { ok: true; title: string; persisted: boolean; skipped?: boolean }
  | { ok: false; error: string };

/** Ask Gemini for a short journal title; persists when entry_id is provided. */
export async function suggestJournalEntryTitle(opts: {
  entryId?: string;
  body?: string;
}): Promise<SuggestTitleResult> {
  const { data, error } = await supabase.functions.invoke("journal-suggest-title", {
    body: opts,
  });

  if (error) {
    return { ok: false, error: edgeFunctionErrorMessage(error) };
  }

  const payload = data as {
    ok?: boolean;
    title?: string;
    persisted?: boolean;
    skipped?: boolean;
    error?: string;
  };

  if (payload?.error) return { ok: false, error: payload.error };
  if (typeof payload?.title !== "string" || !payload.title.trim()) {
    return { ok: false, error: "No title returned" };
  }

  return {
    ok: true,
    title: payload.title.trim(),
    persisted: !!payload.persisted,
    skipped: payload.skipped,
  };
}
