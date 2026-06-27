import { extractReadableProse } from "@/lib/journal/entryDisplay";
import { suggestJournalEntrySummary } from "@/lib/journal/suggestSummary";

const MIN_ENRICH_CHARS = 40;

export type VideoJournalEnrichResult = {
  summary?: string;
  title?: string;
  skipped?: boolean;
};

/** After a video transcript lands in the body, generate AI summary + title on the server. */
export async function enrichVideoJournalEntry(opts: {
  entryId: string;
  body: string;
}): Promise<VideoJournalEnrichResult> {
  if (extractReadableProse(opts.body).length < MIN_ENRICH_CHARS) {
    return { skipped: true };
  }

  const res = await suggestJournalEntrySummary({
    entryId: opts.entryId,
    body: opts.body,
    source: "video",
  });

  if (!res.ok) return { skipped: true };
  if (res.skipped && res.reason === "e2e_encrypted") return { skipped: true };

  return {
    ...(res.summary ? { summary: res.summary } : {}),
    ...(res.title ? { title: res.title } : {}),
    skipped: res.skipped,
  };
}
