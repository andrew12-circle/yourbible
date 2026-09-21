import { getOrCreateMorningConversationEntry } from "./morningConversationJournal";
import { mergeMorningReviewBody, updateMorningFormulaEntry } from "./morningFormulaJournalBody";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { type EntryLinkInput } from "@/lib/journal/links";
import { localDateISO } from "@/lib/lifePriorities";
import type { GoalTouch, LivingHopeGoalRow } from "@/lib/livingHope/api";
import type { MorningConnectionNotes } from "@/lib/livingHope/morningRitual";
import { formatThanksgivingJournalBody, thanksgivingListsFromNotes } from "@/lib/livingHope/morningRitual";
import { WORKBOOK_PHASES, type LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";

export const MORNING_REVIEW_ENTRY_KIND = "morning_review";
export const MORNING_REVIEW_TAG_PREFIX = "lh-review:";

const PHASE_SCRIPTURES = WORKBOOK_PHASES.map((p) => p.scripture);

export interface MorningReviewJournalContext {
  reviewDate: string;
  surrenderNote: string;
  visionRecall?: string | null;
  goalTouches: GoalTouch[];
  manifestoIndex?: number | null;
  storyIndex?: number | null;
  metricValues?: Record<string, number | string>;
  routineChecks?: Record<string, boolean>;
  connectionNotes?: MorningConnectionNotes;
  workbook: LivingHopeWorkbookContent | null;
  goals: LivingHopeGoalRow[];
  /** `living_hope_reviews.id` — stored on the review row after sync. */
  reviewId?: string;
}

export function morningReviewTag(reviewDate: string): string {
  return `${MORNING_REVIEW_TAG_PREFIX}${reviewDate}`;
}

function formatReviewTitle(reviewDate: string): string {
  const [y, m, d] = reviewDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const label = dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `Morning formula · ${label}`;
}

function section(title: string, body: string | null | undefined): string {
  const text = body?.trim();
  if (!text) return "";
  return `## ${title}\n\n${text}\n`;
}

function goalById(goals: LivingHopeGoalRow[], id: string): LivingHopeGoalRow | undefined {
  return goals.find((g) => g.id === id);
}

/** Build markdown body + short summary for a completed morning review. */
export function buildMorningReviewJournalContent(ctx: MorningReviewJournalContext): {
  title: string;
  body: string;
  summary: string;
  verseRefs: string[];
} {
  const manifesto =
    ctx.workbook?.manifesto.length && ctx.manifestoIndex != null
      ? ctx.workbook.manifesto[ctx.manifestoIndex % ctx.workbook.manifesto.length]?.text
      : null;
  const story =
    ctx.workbook?.stories.length && ctx.storyIndex != null
      ? ctx.workbook.stories[ctx.storyIndex % ctx.workbook.stories.length]?.text
      : null;
  const storyBody =
    ctx.connectionNotes?.story_recall?.trim() ||
    story ||
    undefined;

  const visionParts: string[] = [];
  if (ctx.workbook?.vision_headline?.trim()) {
    visionParts.push(ctx.workbook.vision_headline.trim());
  }
  if (ctx.workbook?.income_total_label?.trim()) {
    visionParts.push(ctx.workbook.income_total_label.trim());
  }
  if (ctx.visionRecall?.trim()) {
    visionParts.push(ctx.visionRecall.trim());
  }

  const goalBlocks = ctx.goalTouches
    .map((touch) => {
      const goal = goalById(ctx.goals, touch.goal_id);
      if (!goal) return "";
      const lines = [`### ${goal.title}`];
      if (goal.target_metric?.trim()) lines.push(`Target: ${goal.target_metric.trim()}`);
      if (touch.vivid_recall.trim()) lines.push(`**See it:** ${touch.vivid_recall.trim()}`);
      if (touch.obedience_step.trim()) lines.push(`**Obedience step:** ${touch.obedience_step.trim()}`);
      return lines.join("\n");
    })
    .filter(Boolean);

  const metricLines =
    ctx.workbook?.metrics
      .map((m) => {
        const raw = ctx.metricValues?.[m.id];
        if (raw == null || String(raw).trim() === "") return "";
        const unit = m.unit ? ` ${m.unit}` : "";
        return `- **${m.label}:** ${raw}${unit}`;
      })
      .filter(Boolean) ?? [];

  const assignment = ctx.connectionNotes?.daily_assignment;
  const assignmentLines: string[] = [];
  if (assignment?.spiritual?.trim()) assignmentLines.push(`- **Abide:** ${assignment.spiritual.trim()}`);
  if (assignment?.health?.trim()) assignmentLines.push(`- **Build the temple:** ${assignment.health.trim()}`);
  if (assignment?.family?.trim()) assignmentLines.push(`- **Family:** ${assignment.family.trim()}`);
  if (assignment?.business?.trim()) assignmentLines.push(`- **Work:** ${assignment.business.trim()}`);

  const routineLines =
    ctx.workbook?.routine
      .map((item) => {
        const checked = ctx.routineChecks?.[item.id];
        if (checked == null) return "";
        const label = item.label?.trim() || "Routine item";
        return `- [${checked ? "x" : " "}] ${label}`;
      })
      .filter(Boolean) ?? [];

  const conversationId = ctx.connectionNotes?.conversation_entry_id?.trim();
  const conversationSection =
    [
      ctx.connectionNotes?.prayer_note,
      conversationId ? `[[entry:${conversationId}]]` : null,
    ]
      .filter(Boolean)
      .join("\n\n") || undefined;

  const body = [
    section("Worship", ctx.connectionNotes?.worship_note),
    section(
      "Thanksgiving",
      formatThanksgivingJournalBody(thanksgivingListsFromNotes(ctx.connectionNotes ?? {})) ??
        ctx.connectionNotes?.thanksgiving_note,
    ),
    ctx.connectionNotes?.scripture_ref
      ? section(
          "Scripture",
          [
            ctx.connectionNotes.scripture_ref,
            ctx.connectionNotes.scripture_reflection?.trim(),
          ]
            .filter(Boolean)
            .join("\n\n"),
        )
      : section("Scripture", ctx.connectionNotes?.scripture_reflection),
    section("Conversation", conversationSection),
    section("Manifesto", manifesto),
    visionParts.length ? section("Vision", visionParts.join("\n\n")) : "",
    section("Story", storyBody || undefined),
    assignmentLines.length ? `## Today's assignment\n\n${assignmentLines.join("\n")}\n` : "",
    routineLines.length ? `## Daily routine\n\n${routineLines.join("\n")}\n` : "",
    goalBlocks.length ? `## Goals\n\n${goalBlocks.join("\n\n")}\n` : "",
    metricLines.length ? `## Metrics\n\n${metricLines.join("\n")}\n` : "",
    section("Surrender", ctx.surrenderNote),
    section("Covering", ctx.connectionNotes?.covering_note),
  ]
    .filter(Boolean)
    .join("\n")
    .trim();

  const summarySource =
    ctx.visionRecall?.trim() ||
    manifesto?.trim() ||
    ctx.surrenderNote?.trim() ||
    "Morning formula review";
  const summary = summarySource.replace(/\s+/g, " ").slice(0, 160);

  const goalScriptures = ctx.goalTouches.flatMap((touch) => {
    const goal = goalById(ctx.goals, touch.goal_id);
    return Array.isArray(goal?.scripture_refs) ? goal.scripture_refs : [];
  });

  const scriptureRef = ctx.connectionNotes?.scripture_ref?.trim();
  const verseRefs = [
    ...new Set([
      ...PHASE_SCRIPTURES,
      ...(scriptureRef ? [scriptureRef] : []),
      ...goalScriptures.map((r) => String(r).trim()),
    ]),
  ].filter(Boolean);

  return {
    title: formatReviewTitle(ctx.reviewDate),
    body: body || summarySource,
    summary,
    verseRefs,
  };
}

function tokenOverlapScore(a: string, b: string): number {
  const words = a
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((w) => w.length > 4);
  if (words.length < 2) return 0;
  const hay = b.toLowerCase();
  const hits = words.filter((w) => hay.includes(w)).length;
  return hits / words.length;
}

async function findRelatedBeliefIds(userId: string, manifestoText: string | null | undefined): Promise<string[]> {
  const text = manifestoText?.trim();
  if (!text) return [];
  const { data } = await supabase
    .from("belief_nodes")
    .select("id,statement")
    .eq("user_id", userId)
    .limit(120);
  return (data ?? [])
    .filter((b) => tokenOverlapScore(text, b.statement) >= 0.35)
    .slice(0, 3)
    .map((b) => b.id);
}

/** Journal entry id for a completed review on `reviewDate`, if synced. */
export async function findMorningReviewJournalEntry(
  userId: string,
  reviewDate: string,
): Promise<string | null> {
  return findExistingMorningReviewEntry(userId, reviewDate);
}

async function findExistingMorningReviewEntry(userId: string, reviewDate: string): Promise<string | null> {
  const tag = morningReviewTag(reviewDate);
  const { data } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", userId)
    .in("entry_kind", ["morning_conversation", MORNING_REVIEW_ENTRY_KIND])
    .contains("tags", [tag])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

function verseLinks(refs: string[]): EntryLinkInput[] {
  return refs.map((ref) => ({
    kind: "verse" as const,
    ref: { ref } as Json,
  }));
}

function beliefLinks(beliefIds: string[]): EntryLinkInput[] {
  return beliefIds.map((belief_id) => ({
    kind: "belief" as const,
    ref: { belief_id } as Json,
  }));
}

function entryLinks(entryIds: string[]): EntryLinkInput[] {
  return entryIds.map((entry_id) => ({
    kind: "entry" as const,
    ref: { entry_id } as Json,
  }));
}

/** Upsert today's morning review as a journal entry wired into the mind graph. */
export async function syncMorningReviewToJournal(
  userId: string,
  ctx: MorningReviewJournalContext,
): Promise<{ entryId: string } | null> {
  const { body, summary, verseRefs } = buildMorningReviewJournalContent(ctx);
  const { entryId } = await getOrCreateMorningConversationEntry(userId, ctx.reviewDate);
  await updateMorningFormulaEntry(userId, entryId, (existing) => mergeMorningReviewBody(existing, body), {
    summary, extraTags: [morningReviewTag(ctx.reviewDate), "living-hope", "morning-formula"],
  });
  const manifesto = ctx.workbook?.manifesto.length && ctx.manifestoIndex != null
    ? ctx.workbook.manifesto[ctx.manifestoIndex % ctx.workbook.manifesto.length]?.text : null;

  const beliefIds = await findRelatedBeliefIds(userId, manifesto);
  const linkedEntryIds = [
    ctx.connectionNotes?.conversation_entry_id?.trim(),
  ].filter((id): id is string => Boolean(id && id !== entryId));
  const links = [...verseLinks(verseRefs), ...beliefLinks(beliefIds), ...entryLinks(linkedEntryIds)];
  const { data: existingLinks, error: linksError } = await supabase.from("journal_entry_links")
    .select("target_kind,target_ref").eq("entry_id", entryId).eq("user_id", userId);
  if (linksError) throw linksError;
  const missing = links.filter((link) => !(existingLinks ?? []).some((existing) =>
    existing.target_kind === link.kind && JSON.stringify(existing.target_ref) === JSON.stringify(link.ref)));
  if (missing.length) {
    const { error } = await supabase.from("journal_entry_links").insert(missing.map((link) => ({
      user_id: userId, entry_id: entryId, target_kind: link.kind, target_ref: link.ref,
    })));
    if (error) throw error;
  }

  if (linkedEntryIds.length) {
    for (const otherId of linkedEntryIds) {
      const { data: existing } = await supabase
        .from("journal_entry_links")
        .select("id")
        .eq("entry_id", otherId)
        .eq("target_kind", "entry")
        .contains("target_ref", { entry_id: entryId })
        .maybeSingle();
      if (!existing) {
        await supabase.from("journal_entry_links").insert({
          user_id: userId,
          entry_id: otherId,
          target_kind: "entry",
          target_ref: { entry_id: entryId } as Json,
        });
      }
    }
  }

  if (ctx.reviewId) {
    const { error } = await supabase
      .from("living_hope_reviews")
      .update({ journal_entry_id: entryId })
      .eq("id", ctx.reviewId)
      .eq("user_id", userId);
    if (error) throw error;
  }

  return { entryId };
}

/** Default review date for sync (local calendar day). */
export function defaultMorningReviewDate(): string {
  return localDateISO();
}
