import { supabase } from "@/integrations/supabase/client";

export const MORNING_REVIEW_START = "<!-- morning-formula-review:start -->";
export const MORNING_REVIEW_END = "<!-- morning-formula-review:end -->";

/** Replace only a single exact H2 section; preserve other notes and media tokens. */
export function replaceMorningSection(body: string, heading: string, content: string, beforeHeading?: string): string {
  const lines = body.split("\n");
  const start = lines.findIndex((line) => line.trimEnd() === heading);
  const block = `${heading}\n\n${content.trim()}\n\n`;
  if (start < 0) {
    const before = beforeHeading ? lines.findIndex((line) => line.trimEnd() === beforeHeading) : -1;
    if (before >= 0) return `${lines.slice(0, before).join("\n")}\n${block}${lines.slice(before).join("\n")}`.trimStart();
    return `${block}${body}`;
  }
  let end = start + 1;
  while (end < lines.length && !/^##\s/.test(lines[end]) && lines[end] !== MORNING_REVIEW_START) end++;
  return `${lines.slice(0, start).join("\n")}${start ? "\n" : ""}${block}${lines.slice(end).join("\n")}`;
}

/** The full session summary lives inside the original journal, not a second row. */
export function mergeMorningReviewBody(existing: string, compiled: string): string {
  // Worship/thanks/heart already live above, including the video transcript.
  const extra = compiled.split(/(?=^##\s)/m)
    .filter((section) => !/^## (?:Worship|Thanksgiving|Conversation)\s*\n/.test(section))
    .join("").trim();
  const managed = `${MORNING_REVIEW_START}\n\n## Completed Morning Formula\n\n${extra}\n\n${MORNING_REVIEW_END}`;
  const start = existing.indexOf(MORNING_REVIEW_START);
  const end = start >= 0 ? existing.indexOf(MORNING_REVIEW_END, start) : -1;
  if (start >= 0 && end >= 0) return existing.slice(0, start) + managed + existing.slice(end + MORNING_REVIEW_END.length);
  return `${existing.trimEnd()}\n\n${managed}\n`;
}

const entryWrites = new Map<string, Promise<void>>();

export function updateMorningFormulaEntry(
  userId: string,
  entryId: string,
  transform: (body: string) => string,
  options: { summary?: string; extraTags?: string[] } = {},
): Promise<void> {
  const key = `${userId}:${entryId}`;
  const previous = entryWrites.get(key) ?? Promise.resolve();
  const request = previous.catch(() => undefined).then(() => saveMorningFormulaEntry(userId, entryId, transform, options));
  entryWrites.set(key, request);
  void request.finally(() => { if (entryWrites.get(key) === request) entryWrites.delete(key); }).catch(() => undefined);
  return request;
}

/** Optimistic concurrency prevents a late text/thanks save from erasing another section. */
async function saveMorningFormulaEntry(
  userId: string,
  entryId: string,
  transform: (body: string) => string,
  options: { summary?: string; extraTags?: string[] } = {},
): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: row, error } = await supabase.from("journal_entries")
      .select("body,tags,revision,e2e_encrypted").eq("id", entryId).eq("user_id", userId).maybeSingle();
    if (error) throw error;
    if (!row) throw new Error("Today's journal could not be found. Your draft has not been cleared.");
    if (row.e2e_encrypted) throw new Error("Open and unlock this private entry in the journal before editing it.");
    const { data: saved, error: saveError } = await supabase.from("journal_entries")
      .update({ body: transform(row.body ?? ""), ...(options.summary ? { summary: options.summary } : {}),
        ...(options.extraTags ? { tags: [...new Set([...(row.tags ?? []), ...options.extraTags])] } : {}) })
      .eq("id", entryId).eq("user_id", userId).eq("revision", row.revision).select("id").maybeSingle();
    if (saveError) throw saveError;
    if (saved) return;
  }
  throw new Error("Your journal changed on another screen. Try saving again; your draft is still here.");
}
