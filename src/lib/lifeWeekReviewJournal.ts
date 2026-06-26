import { supabase } from "@/integrations/supabase/client";
import type { Journal } from "@/lib/journal/journals";
import { isJournalE2eSchemaError } from "@/lib/journal/journalE2eSchema";
import {
  LIFE_WEEK_REFLECTION_PROMPT,
  type LifeWeekReviewSubject,
} from "@/lib/lifeWeekReview";

export const LIFE_WEEK_REVIEW_ENTRY_KIND = "life_week_review";
export const LIFE_WEEK_REVIEW_JOURNAL_NAME = "Week reviews";
export const LIFE_WEEK_REVIEW_SOURCE_KIND = "life_week_reviews";
export const LIFE_WEEK_REVIEW_SOURCE_REF = "default";
export const LIFE_WEEK_REVIEW_TAG_PREFIX = "lw-review:";

export type LifeWeekReviewJournalContext = {
  subject: LifeWeekReviewSubject;
  personName: string;
  weekIndex: number;
  weekNumber: number;
  weekRangeLabel: string;
  weekStart: string;
  reflection: string;
  completedAt?: string;
};

function subjectLabel(subject: LifeWeekReviewSubject, personName: string): string {
  if (subject === "self") return personName.trim() || "Me";
  return personName.trim() || subject;
}

export function lifeWeekReviewTag(subject: LifeWeekReviewSubject, weekIndex: number): string {
  return `${LIFE_WEEK_REVIEW_TAG_PREFIX}${subject}:${weekIndex}`;
}

export function formatLifeWeekReviewTitle(ctx: Pick<LifeWeekReviewJournalContext, "subject" | "personName" | "weekRangeLabel">): string {
  const who = ctx.subject === "self" ? "My week" : `${subjectLabel(ctx.subject, ctx.personName)}'s week`;
  return `${who} · ${ctx.weekRangeLabel}`;
}

export function buildLifeWeekReviewJournalContent(ctx: LifeWeekReviewJournalContext): {
  title: string;
  body: string;
  summary: string;
} {
  const who = subjectLabel(ctx.subject, ctx.personName);
  const prompt =
    ctx.subject === "self"
      ? LIFE_WEEK_REFLECTION_PROMPT
      : `What stood out about ${who}'s past week—joys, struggles, or moments you want to remember while they're still home?`;

  const body = [
    `## Week ${ctx.weekNumber}`,
    "",
    `**${ctx.weekRangeLabel}** · closed ${ctx.weekStart}`,
    "",
    "### Prompt",
    "",
    prompt,
    "",
    "### Reflection",
    "",
    ctx.reflection.trim(),
  ].join("\n");

  const summary = ctx.reflection.trim().slice(0, 220);

  return {
    title: formatLifeWeekReviewTitle(ctx),
    body,
    summary,
  };
}

function isSchemaCompatError(error: unknown): boolean {
  if (isJournalE2eSchemaError(error)) return true;
  if (!error || typeof error !== "object" || !("message" in error)) return false;
  const msg = String((error as { message: unknown }).message);
  return /source_kind|entry_kind|check constraint/i.test(msg);
}

async function selectLifeWeekReviewJournal(userId: string): Promise<Journal | null> {
  const { data: official } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", userId)
    .eq("source_kind", LIFE_WEEK_REVIEW_SOURCE_KIND)
    .eq("source_ref", LIFE_WEEK_REVIEW_SOURCE_REF)
    .maybeSingle();
  if (official) return official as Journal;

  const { data: byName } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", userId)
    .eq("name", LIFE_WEEK_REVIEW_JOURNAL_NAME)
    .eq("icon", "calendar-range")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return (byName as Journal) ?? null;
}

/** Idempotent — dedicated notebook for week close-out reflections. */
export async function ensureLifeWeekReviewJournal(userId: string): Promise<Journal | null> {
  try {
    const existing = await selectLifeWeekReviewJournal(userId);
    if (existing) return existing;

    const payload = {
      user_id: userId,
      name: LIFE_WEEK_REVIEW_JOURNAL_NAME,
      color: "172 66% 50%",
      icon: "calendar-range",
      sort_order: -3,
      is_default: false,
      source_kind: LIFE_WEEK_REVIEW_SOURCE_KIND,
      source_ref: LIFE_WEEK_REVIEW_SOURCE_REF,
      e2e_required: false,
    };

    const { data: created, error } = await supabase.from("journals").insert(payload).select("*").maybeSingle();
    if (!error && created) return created as Journal;
    if (error && !isSchemaCompatError(error)) throw error;

    return await selectLifeWeekReviewJournal(userId);
  } catch (e) {
    if (isSchemaCompatError(e)) return await selectLifeWeekReviewJournal(userId);
    throw e;
  }
}

async function findExistingLifeWeekReviewEntry(
  userId: string,
  subject: LifeWeekReviewSubject,
  weekIndex: number,
): Promise<string | null> {
  const tag = lifeWeekReviewTag(subject, weekIndex);
  const { data } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("entry_kind", LIFE_WEEK_REVIEW_ENTRY_KIND)
    .contains("tags", [tag])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Upsert a closed week as a journal entry in the Week reviews notebook. */
export async function syncLifeWeekReviewToJournal(
  userId: string,
  ctx: LifeWeekReviewJournalContext,
): Promise<{ entryId: string } | null> {
  const journal = await ensureLifeWeekReviewJournal(userId);
  if (!journal) return null;

  const { title, body, summary } = buildLifeWeekReviewJournalContent(ctx);
  const tag = lifeWeekReviewTag(ctx.subject, ctx.weekIndex);
  const entryAt = ctx.weekStart;
  const entryAtTs = ctx.completedAt ?? new Date().toISOString();
  const tags = [tag, "life-in-weeks", "week-close-out", ctx.subject];

  const existingId = await findExistingLifeWeekReviewEntry(userId, ctx.subject, ctx.weekIndex);

  if (existingId) {
    const { error } = await supabase
      .from("journal_entries")
      .update({
        journal_id: journal.id,
        title,
        body,
        summary,
        entry_at: entryAt,
        entry_at_ts: entryAtTs,
        tags,
        analyze_for_mirror: true,
      })
      .eq("id", existingId)
      .eq("user_id", userId);
    if (error) throw error;
    return { entryId: existingId };
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({
      user_id: userId,
      journal_id: journal.id,
      title,
      body,
      summary,
      entry_kind: LIFE_WEEK_REVIEW_ENTRY_KIND,
      entry_at: entryAt,
      entry_at_ts: entryAtTs,
      tags,
      analyze_for_mirror: true,
    })
    .select("id")
    .single();

  if (error) {
    if (isSchemaCompatError(error)) {
      const { data: fallback, error: fallbackErr } = await supabase
        .from("journal_entries")
        .insert({
          user_id: userId,
          journal_id: journal.id,
          title,
          body,
          summary,
          entry_at: entryAt,
          entry_at_ts: entryAtTs,
          tags,
          analyze_for_mirror: true,
        })
        .select("id")
        .single();
      if (fallbackErr) throw fallbackErr;
      return fallback?.id ? { entryId: fallback.id } : null;
    }
    throw error;
  }

  return data?.id ? { entryId: data.id } : null;
}
