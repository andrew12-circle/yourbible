import { replaceMorningSection, updateMorningFormulaEntry } from "./morningFormulaJournalBody";
import { supabase } from "@/integrations/supabase/client";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { localDateISO } from "@/lib/lifePriorities";
import { scheduleEntryContextEnrichment } from "@/lib/journal/context";
import {
  formatThanksgivingJournalBody,
  type ThanksgivingLists,
} from "@/lib/livingHope/morningRitual";

export const MORNING_CONVERSATION_ENTRY_KIND = "morning_conversation";
export const MORNING_CONVERSATION_TAG_PREFIX = "lh-conversation:";
export const MORNING_CONVERSATION_THANKSGIVING_HEADING = "## Thanksgiving";
export const MORNING_CONVERSATION_WORSHIP_HEADING = "## Worship";
export const MORNING_CONVERSATION_HEART_HEADING = "## What's on my heart";
export const MORNING_CONVERSATION_LISTENING_HEADING = "## Listening";

export const MORNING_FORMULA_JOURNAL_SECTIONS = [
  MORNING_CONVERSATION_WORSHIP_HEADING,
  MORNING_CONVERSATION_THANKSGIVING_HEADING,
  MORNING_CONVERSATION_HEART_HEADING,
  MORNING_CONVERSATION_LISTENING_HEADING,
] as const;

export function morningConversationTag(reviewDate: string): string {
  return `${MORNING_CONVERSATION_TAG_PREFIX}${reviewDate}`;
}

export function conversationEntryTitle(reviewDate: string): string {
  const [y, m, d] = reviewDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const label = dt.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  return `Today's formula · ${label}`;
}

export const MORNING_CONVERSATION_BODY_TEMPLATE = `${MORNING_CONVERSATION_WORSHIP_HEADING}

(Optional — capture anything from worship here if you want.)

${MORNING_CONVERSATION_THANKSGIVING_HEADING}

### Thankful now

1. 
2. 
3. 
4. 
5. 

### Thankful for what has not yet come

1. 
2. 
3. 
4. 
5. 

${MORNING_CONVERSATION_HEART_HEADING}

Talk, type, dictate, sketch, or add photos and video — whatever is honest today.

${MORNING_CONVERSATION_LISTENING_HEADING}

**Ask:** God, what do you want me to know today?

**Then listen.** Don't rush. Write what you hear when you're ready:

`;

/** Pull plain text from a markdown section without the heading. */
export function extractJournalSection(
  body: string,
  heading: string,
  followingHeadings: readonly string[],
): string | undefined {
  const idx = body.indexOf(heading);
  if (idx < 0) return undefined;
  const start = idx + heading.length;
  let end = body.length;
  for (const next of followingHeadings) {
    const nextIdx = body.indexOf(next, start);
    if (nextIdx >= 0 && nextIdx < end) end = nextIdx;
  }
  const text = body
    .slice(start, end)
    .trim()
    .replace(/^\(Optional[^)]*\)\s*/i, "")
    .trim();
  return text || undefined;
}

export function extractWorshipNote(body: string): string | undefined {
  return extractJournalSection(body, MORNING_CONVERSATION_WORSHIP_HEADING, [
    MORNING_CONVERSATION_THANKSGIVING_HEADING,
    MORNING_CONVERSATION_HEART_HEADING,
    MORNING_CONVERSATION_LISTENING_HEADING,
  ]);
}

export function extractHeartNote(body: string): string | undefined {
  return extractJournalSection(body, MORNING_CONVERSATION_HEART_HEADING, [
    MORNING_CONVERSATION_LISTENING_HEADING,
  ]);
}

const WORSHIP_PLACEHOLDER = "(Optional — capture anything from worship here if you want.)";

/** Replace or insert the worship section without touching thanks, heart, or listening content. */
export function mergeWorshipIntoConversationBody(existingBody: string, worshipText: string): string {
  return replaceMorningSection(existingBody, MORNING_CONVERSATION_WORSHIP_HEADING, worshipText.trim() || WORSHIP_PLACEHOLDER);
}

/** Replace or insert the heart section without touching listening content. */
export function mergeHeartIntoConversationBody(existingBody: string, heartText: string): string {
  return replaceMorningSection(existingBody, MORNING_CONVERSATION_HEART_HEADING,
    heartText.trim() || "Talk, type, dictate, sketch, or add photos and video — whatever is honest today.",
    MORNING_CONVERSATION_LISTENING_HEADING);
}

export async function syncWorshipToConversationEntry(userId: string, entryId: string, worshipText: string): Promise<void> {
  await updateMorningFormulaEntry(userId, entryId, (body) => mergeWorshipIntoConversationBody(body, worshipText));
}

export async function syncHeartToConversationEntry(userId: string, entryId: string, heartText: string): Promise<void> {
  await updateMorningFormulaEntry(userId, entryId, (body) => mergeHeartIntoConversationBody(body, heartText));
}

/** Build the Thanksgiving section for the morning conversation journal entry. */
export function buildThanksgivingSectionBody(lists: ThanksgivingLists): string {
  const formatted = formatThanksgivingJournalBody(lists);
  if (!formatted) return `${MORNING_CONVERSATION_THANKSGIVING_HEADING}\n\n`;
  return `${MORNING_CONVERSATION_THANKSGIVING_HEADING}\n\n${formatted}\n`;
}

/** Replace or prepend the Thanksgiving section without touching worship, heart, or listening content. */
export function mergeThanksgivingIntoConversationBody(existingBody: string, lists: ThanksgivingLists): string {
  return replaceMorningSection(existingBody, MORNING_CONVERSATION_THANKSGIVING_HEADING,
    formatThanksgivingJournalBody(lists) ?? "");
}

export async function findMorningConversationEntry(
  userId: string,
  reviewDate = localDateISO(),
): Promise<string | null> {
  const tag = morningConversationTag(reviewDate);
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("entry_kind", MORNING_CONVERSATION_ENTRY_KIND)
    .contains("tags", [tag])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

const pendingEntries = new Map<string, Promise<{ entryId: string; created: boolean }>>();

/** One in-flight request per user/day, with a database lock across tabs/devices. */
export async function getOrCreateMorningConversationEntry(
  userId: string,
  reviewDate = localDateISO(),
): Promise<{ entryId: string; created: boolean }> {
  const key = `${userId}:${reviewDate}`;
  const pending = pendingEntries.get(key);
  if (pending) return pending;
  const request = (async () => {
    const existingId = await findMorningConversationEntry(userId, reviewDate);
    if (existingId) return { entryId: existingId, created: false };
    const journalId = await getDefaultJournalId(userId);
    const { data, error } = await supabase.rpc("ensure_morning_formula_entry", {
      p_review_date: reviewDate,
      p_journal_id: journalId,
      p_title: conversationEntryTitle(reviewDate),
      p_body: MORNING_CONVERSATION_BODY_TEMPLATE,
      p_context: {},
    });
    if (error) throw error;
    if (!data?.[0]?.entry_id) throw new Error("Couldn't create today's journal. Try again.");
    if (data[0].created) scheduleEntryContextEnrichment(userId, data[0].entry_id);
    return { entryId: data[0].entry_id, created: data[0].created };
  })();
  pendingEntries.set(key, request);
  try { return await request; } finally { if (pendingEntries.get(key) === request) pendingEntries.delete(key); }
}

/** Sync thanksgiving lists into today's conversation journal entry. */
export async function syncThanksgivingToConversationEntry(userId: string, entryId: string, lists: ThanksgivingLists): Promise<void> {
  await updateMorningFormulaEntry(userId, entryId, (body) => mergeThanksgivingIntoConversationBody(body, lists));
}

export async function fetchConversationEntryPreview(entryId: string): Promise<{
  title: string | null;
  excerpt: string;
} | null> {
  const { data } = await supabase
    .from("journal_entries")
    .select("title, body, summary")
    .eq("id", entryId)
    .maybeSingle();
  if (!data) return null;
  const raw = String(data.body ?? data.summary ?? "").trim();
  const excerpt = raw.replace(/^#+\s.+$/gm, "").replace(/\*\*/g, "").trim().slice(0, 180);
  return { title: data.title, excerpt };
}
