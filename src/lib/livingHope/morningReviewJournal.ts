import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { setEntryLinks, type EntryLinkInput } from "@/lib/journal/links";
import { localDateISO } from "@/lib/lifePriorities";
import type { GoalTouch, LivingHopeGoalRow } from "@/lib/livingHope/api";
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
  workbook: LivingHopeWorkbookContent | null;
  goals: LivingHopeGoalRow[];
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

  const body = [
    section("Manifesto", manifesto),
    visionParts.length ? section("Vision", visionParts.join("\n\n")) : "",
    section("Story", story),
    goalBlocks.length ? `## Goals\n\n${goalBlocks.join("\n\n")}\n` : "",
    metricLines.length ? `## Metrics\n\n${metricLines.join("\n")}\n` : "",
    section("Surrender", ctx.surrenderNote),
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

  const verseRefs = [...new Set([...PHASE_SCRIPTURES, ...goalScriptures.map((r) => String(r).trim())])].filter(
    Boolean,
  );

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
    .eq("entry_kind", MORNING_REVIEW_ENTRY_KIND)
    .contains("tags", [tag])
    .order("updated_at", { ascending: false })
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

/** Upsert today's morning review as a journal entry wired into the mind graph. */
export async function syncMorningReviewToJournal(
  userId: string,
  ctx: MorningReviewJournalContext,
): Promise<{ entryId: string } | null> {
  const { title, body, summary, verseRefs } = buildMorningReviewJournalContent(ctx);
  const tag = morningReviewTag(ctx.reviewDate);
  const nowIso = new Date().toISOString();

  const manifesto =
    ctx.workbook?.manifesto.length && ctx.manifestoIndex != null
      ? ctx.workbook.manifesto[ctx.manifestoIndex % ctx.workbook.manifesto.length]?.text
      : null;

  const existingId = await findExistingMorningReviewEntry(userId, ctx.reviewDate);
  let entryId = existingId;

  if (entryId) {
    const { error } = await supabase
      .from("journal_entries")
      .update({
        title,
        body,
        summary,
        entry_at: ctx.reviewDate,
        entry_at_ts: nowIso,
        tags: [tag, "living-hope", "morning-formula"],
        analyze_for_mirror: true,
      })
      .eq("id", entryId)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("journal_entries")
      .insert({
        user_id: userId,
        title,
        body,
        summary,
        entry_kind: MORNING_REVIEW_ENTRY_KIND,
        entry_at: ctx.reviewDate,
        entry_at_ts: nowIso,
        tags: [tag, "living-hope", "morning-formula"],
        analyze_for_mirror: true,
      })
      .select("id")
      .single();
    if (error) throw error;
    entryId = data.id;
  }

  if (!entryId) return null;

  const beliefIds = await findRelatedBeliefIds(userId, manifesto);
  await setEntryLinks(userId, entryId, [...verseLinks(verseRefs), ...beliefLinks(beliefIds)]);

  return { entryId };
}

/** Default review date for sync (local calendar day). */
export function defaultMorningReviewDate(): string {
  return localDateISO();
}
