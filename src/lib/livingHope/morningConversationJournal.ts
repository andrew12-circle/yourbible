import { supabase } from "@/integrations/supabase/client";
import { getDefaultJournalId } from "@/lib/journal/journals";
import { localDateISO } from "@/lib/lifePriorities";
import { getCurrentContext } from "@/lib/journal/context";
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
  const trimmed = worshipText.trim();
  const worshipBlock = trimmed
    ? `${MORNING_CONVERSATION_WORSHIP_HEADING}\n\n${trimmed}\n\n`
    : `${MORNING_CONVERSATION_WORSHIP_HEADING}\n\n${WORSHIP_PLACEHOLDER}\n\n`;

  const body = existingBody.trimStart();
  const worshipIdx = body.indexOf(MORNING_CONVERSATION_WORSHIP_HEADING);
  const thanksgivingIdx = body.indexOf(MORNING_CONVERSATION_THANKSGIVING_HEADING);
  const heartIdx = body.indexOf(MORNING_CONVERSATION_HEART_HEADING);

  const afterWorshipStart =
    worshipIdx >= 0 ? worshipIdx + MORNING_CONVERSATION_WORSHIP_HEADING.length : 0;
  let afterWorshipEnd = body.length;
  for (const idx of [thanksgivingIdx, heartIdx].filter((i) => i >= 0)) {
    if (idx >= afterWorshipStart && idx < afterWorshipEnd) afterWorshipEnd = idx;
  }

  if (worshipIdx >= 0) {
    return `${body.slice(0, worshipIdx)}${worshipBlock}${body.slice(afterWorshipEnd)}`;
  }
  return `${worshipBlock}${body}`;
}

/** Replace or insert the heart section without touching listening content. */
export function mergeHeartIntoConversationBody(existingBody: string, heartText: string): string {
  const trimmed = heartText.trim();
  const heartBlock = trimmed
    ? `${MORNING_CONVERSATION_HEART_HEADING}\n\n${trimmed}\n\n`
    : `${MORNING_CONVERSATION_HEART_HEADING}\n\nTalk, type, dictate, sketch, or add photos and video — whatever is honest today.\n\n`;

  const body = existingBody.trimStart();
  const heartIdx = body.indexOf(MORNING_CONVERSATION_HEART_HEADING);
  const listeningIdx = body.indexOf(MORNING_CONVERSATION_LISTENING_HEADING);

  const afterHeartStart =
    heartIdx >= 0 ? heartIdx + MORNING_CONVERSATION_HEART_HEADING.length : 0;
  const afterHeartEnd =
    listeningIdx >= 0 && listeningIdx >= afterHeartStart ? listeningIdx : body.length;

  if (heartIdx >= 0) {
    return `${body.slice(0, heartIdx)}${heartBlock}${body.slice(afterHeartEnd)}`;
  }
  if (listeningIdx >= 0) {
    return `${body.slice(0, listeningIdx)}${heartBlock}${body.slice(listeningIdx)}`;
  }
  return `${body}\n\n${heartBlock}`;
}

async function loadConversationBody(userId: string, entryId: string): Promise<string> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("body")
    .eq("id", entryId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Conversation entry not found");
  return String(data.body ?? MORNING_CONVERSATION_BODY_TEMPLATE);
}

async function saveConversationBody(userId: string, entryId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from("journal_entries")
    .update({ body, summary: "Today's morning formula" })
    .eq("id", entryId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function syncWorshipToConversationEntry(
  userId: string,
  entryId: string,
  worshipText: string,
): Promise<void> {
  const existingBody = await loadConversationBody(userId, entryId);
  const body = mergeWorshipIntoConversationBody(existingBody, worshipText);
  await saveConversationBody(userId, entryId, body);
}

export async function syncHeartToConversationEntry(
  userId: string,
  entryId: string,
  heartText: string,
): Promise<void> {
  const existingBody = await loadConversationBody(userId, entryId);
  const body = mergeHeartIntoConversationBody(existingBody, heartText);
  await saveConversationBody(userId, entryId, body);
}

/** Build the Thanksgiving section for the morning conversation journal entry. */
export function buildThanksgivingSectionBody(lists: ThanksgivingLists): string {
  const formatted = formatThanksgivingJournalBody(lists);
  if (!formatted) return `${MORNING_CONVERSATION_THANKSGIVING_HEADING}\n\n`;
  return `${MORNING_CONVERSATION_THANKSGIVING_HEADING}\n\n${formatted}\n`;
}

/** Replace or prepend the Thanksgiving section without touching worship, heart, or listening content. */
export function mergeThanksgivingIntoConversationBody(
  existingBody: string,
  lists: ThanksgivingLists,
): string {
  const thanksgivingBlock = buildThanksgivingSectionBody(lists);
  const body = existingBody.trimStart();
  const worshipIdx = body.indexOf(MORNING_CONVERSATION_WORSHIP_HEADING);
  const thanksgivingIdx = body.indexOf(MORNING_CONVERSATION_THANKSGIVING_HEADING);
  const heartIdx = body.indexOf(MORNING_CONVERSATION_HEART_HEADING);

  const worshipEnd =
    thanksgivingIdx >= 0 ? thanksgivingIdx : heartIdx >= 0 ? heartIdx : body.length;
  const worshipPrefix =
    worshipIdx >= 0 ? `${body.slice(worshipIdx, worshipEnd).trimEnd()}\n\n` : "";

  if (heartIdx >= 0) {
    return `${worshipPrefix}${thanksgivingBlock}\n${body.slice(heartIdx)}`;
  }
  if (worshipPrefix) {
    return `${worshipPrefix}${thanksgivingBlock}\n`;
  }
  return `${thanksgivingBlock}\n${body}`;
}

export async function findMorningConversationEntry(
  userId: string,
  reviewDate = localDateISO(),
): Promise<string | null> {
  const tag = morningConversationTag(reviewDate);
  const { data } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("entry_kind", MORNING_CONVERSATION_ENTRY_KIND)
    .contains("tags", [tag])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Get or create today's in-flow conversation journal entry. */
export async function getOrCreateMorningConversationEntry(
  userId: string,
  reviewDate = localDateISO(),
): Promise<{ entryId: string; created: boolean }> {
  const existingId = await findMorningConversationEntry(userId, reviewDate);
  if (existingId) return { entryId: existingId, created: false };

  const journalId = await getDefaultJournalId(userId);
  const ctx = await getCurrentContext().catch(() => ({} as Record<string, never>));
  const now = new Date();
  const tag = morningConversationTag(reviewDate);
  const title = conversationEntryTitle(reviewDate);

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: userId,
      journal_id: journalId,
      title,
      body: MORNING_CONVERSATION_BODY_TEMPLATE,
      summary: "Today's morning formula",
      entry_kind: MORNING_CONVERSATION_ENTRY_KIND,
      entry_at: reviewDate,
      entry_at_ts: now.toISOString(),
      tags: [tag, "living-hope", "morning-formula", "conversation"],
      analyze_for_mirror: true,
      location_name: ctx.location_name ?? null,
      lat: ctx.lat ?? null,
      lng: ctx.lng ?? null,
      weather: ctx.weather ?? null,
      weather_temp_c: ctx.weather_temp_c ?? null,
      weather_icon: ctx.weather_icon ?? null,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Couldn't create conversation entry");
  return { entryId: data.id, created: true };
}

/** Sync thanksgiving lists into today's conversation journal entry. */
export async function syncThanksgivingToConversationEntry(
  userId: string,
  entryId: string,
  lists: ThanksgivingLists,
): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from("journal_entries")
    .select("body")
    .eq("id", entryId)
    .eq("user_id", userId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!data) throw new Error("Conversation entry not found");

  const existingBody = String(data.body ?? MORNING_CONVERSATION_BODY_TEMPLATE);
  const body = mergeThanksgivingIntoConversationBody(existingBody, lists);

  const { error } = await supabase
    .from("journal_entries")
    .update({
      body,
      summary: "Today's morning formula",
    })
    .eq("id", entryId)
    .eq("user_id", userId);
  if (error) throw error;
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
