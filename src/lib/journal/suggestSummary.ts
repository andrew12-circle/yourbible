import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";

export type SuggestSummaryResult =
  | {
      ok: true;
      summary?: string;
      title?: string;
      persisted?: boolean;
      skipped?: boolean;
      reason?: string;
    }
  | { ok: false; error: string };

/** Ask AI for a journal summary (and title when needed); persists when entry_id is set. */
export async function suggestJournalEntrySummary(opts: {
  entryId?: string;
  body?: string;
  source?: "video" | "default";
  force?: boolean;
}): Promise<SuggestSummaryResult> {
  const { data, error } = await supabase.functions.invoke("journal-suggest-summary", {
    body: {
      entry_id: opts.entryId,
      body: opts.body,
      source: opts.source,
      force: opts.force,
    },
  });

  if (error) {
    return { ok: false, error: edgeFunctionErrorMessage(error) };
  }

  const payload = data as {
    ok?: boolean;
    summary?: string | null;
    title?: string | null;
    persisted?: boolean;
    skipped?: boolean;
    reason?: string;
    error?: string;
  };

  if (payload?.error) return { ok: false, error: payload.error };
  if (payload?.ok !== true) {
    return { ok: false, error: "Unexpected response from summary service" };
  }

  return {
    ok: true,
    ...(typeof payload.summary === "string" && payload.summary.trim()
      ? { summary: payload.summary.trim() }
      : {}),
    ...(typeof payload.title === "string" && payload.title.trim()
      ? { title: payload.title.trim() }
      : {}),
    persisted: payload.persisted,
    skipped: payload.skipped,
    ...(payload.reason ? { reason: payload.reason } : {}),
  };
}
