import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import {
  localGetWeeklyReview,
  localGetWorkbook,
  localSaveWeeklyReview,
  localSaveWorkbook,
  notifyLocalModeOnce,
} from "@/lib/livingHope/livingHopeLocalStore";
import {
  emptyWorkbook,
  mergeWorkbook,
  weekStartISO,
  type LivingHopeWorkbookContent,
  type WorkbookStory,
} from "@/lib/livingHope/workbookTypes";
import { isSupabaseMissingTable } from "@/lib/supabase/errors";

export type WorkbookRow = Tables<"living_hope_workbook">;
export type WeeklyReviewRow = Tables<"living_hope_weekly_reviews">;

export async function getOrCreateWorkbook(userId: string): Promise<LivingHopeWorkbookContent> {
  try {
    const { data, error } = await supabase
      .from("living_hope_workbook")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (data) return mergeWorkbook(data.content);

    const insert: TablesInsert<"living_hope_workbook"> = {
      user_id: userId,
      content: emptyWorkbook() as unknown as TablesInsert<"living_hope_workbook">["content"],
    };
    const { data: created, error: insErr } = await supabase
      .from("living_hope_workbook")
      .insert(insert)
      .select()
      .single();
    if (insErr) throw insErr;
    return mergeWorkbook(created.content);
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    notifyLocalModeOnce();
    return localGetWorkbook(userId);
  }
}

function storyChanged(a: WorkbookStory, b: WorkbookStory): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

/**
 * Three-way merge for scene edits.
 *
 * `base` is what this browser last loaded from Supabase, `desired` is the
 * browser's edited scene list, and `current` is the newest scene list on the
 * server. This preserves scenes that appeared on the server after the browser
 * loaded, while still honoring explicit edits, additions, and deletions the
 * browser made to scenes it actually knew about.
 */
export function mergeWorkbookStories(
  base: WorkbookStory[],
  desired: WorkbookStory[],
  current: WorkbookStory[],
): WorkbookStory[] {
  const baseById = new Map(base.map((story) => [story.id, story]));
  const desiredById = new Map(desired.map((story) => [story.id, story]));
  const deletedIds = new Set(base.filter((story) => !desiredById.has(story.id)).map((story) => story.id));

  const merged = current
    .filter((story) => !deletedIds.has(story.id))
    .map((story) => {
      const baseStory = baseById.get(story.id);
      const desiredStory = desiredById.get(story.id);
      if (baseStory && desiredStory && storyChanged(baseStory, desiredStory)) return desiredStory;
      return story;
    });

  const mergedIds = new Set(merged.map((story) => story.id));
  for (const story of desired) {
    const baseStory = baseById.get(story.id);
    const isLocalAddition = !baseStory;
    const isLocalEdit = Boolean(baseStory && storyChanged(baseStory, story));
    if (!mergedIds.has(story.id) && (isLocalAddition || isLocalEdit)) {
      merged.push(story);
      mergedIds.add(story.id);
    }
  }

  return merged;
}

export async function saveWorkbook(userId: string, content: LivingHopeWorkbookContent): Promise<void> {
  try {
    const { error } = await supabase.from("living_hope_workbook").upsert({
      user_id: userId,
      content: content as unknown as TablesInsert<"living_hope_workbook">["content"],
    });
    if (error) throw error;
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    localSaveWorkbook(userId, content);
  }
}

/**
 * Save only the fields the browser actually changed. This prevents a stale
 * Morning Formula tab from replacing newer server data in unrelated workbook
 * sections. Scene arrays receive a three-way merge so remote scene additions
 * survive a later edit from an older tab.
 */
export async function saveWorkbookPatch(
  userId: string,
  patch: Partial<LivingHopeWorkbookContent>,
  baseContent: LivingHopeWorkbookContent | null,
): Promise<LivingHopeWorkbookContent> {
  try {
    const { data, error } = await supabase
      .from("living_hope_workbook")
      .select("content")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;

    const current = data ? mergeWorkbook(data.content) : baseContent ?? emptyWorkbook();
    const next: LivingHopeWorkbookContent = { ...current, ...patch };

    if (patch.stories) {
      next.stories = mergeWorkbookStories(
        baseContent?.stories ?? current.stories,
        patch.stories,
        current.stories,
      );
    }

    const { data: saved, error: saveError } = await supabase
      .from("living_hope_workbook")
      .upsert({
        user_id: userId,
        content: next as unknown as TablesInsert<"living_hope_workbook">["content"],
      })
      .select("content")
      .single();
    if (saveError) throw saveError;
    return mergeWorkbook(saved.content);
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    const current = localGetWorkbook(userId);
    const next: LivingHopeWorkbookContent = { ...current, ...patch };
    if (patch.stories) {
      next.stories = mergeWorkbookStories(
        baseContent?.stories ?? current.stories,
        patch.stories,
        current.stories,
      );
    }
    localSaveWorkbook(userId, next);
    return next;
  }
}

export async function getWeeklyReview(userId: string, weekStart?: string): Promise<WeeklyReviewRow | null> {
  const ws = weekStart ?? weekStartISO();
  try {
    const { data, error } = await supabase
      .from("living_hope_weekly_reviews")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", ws)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    const local = localGetWeeklyReview(userId, ws);
    if (!local) return null;
    return {
      id: `local-${ws}`,
      user_id: userId,
      week_start: local.week_start,
      answers: local.answers,
      completed_at: local.completed_at,
      created_at: local.completed_at,
    };
  }
}

export async function saveWeeklyReview(
  userId: string,
  answers: string[],
  weekStart?: string,
): Promise<WeeklyReviewRow> {
  const ws = weekStart ?? weekStartISO();
  try {
    const row: TablesInsert<"living_hope_weekly_reviews"> = {
      user_id: userId,
      week_start: ws,
      answers,
      completed_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("living_hope_weekly_reviews")
      .upsert(row, { onConflict: "user_id,week_start" })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (e) {
    if (!isSupabaseMissingTable(e)) throw e;
    const local = localSaveWeeklyReview(userId, ws, answers);
    return {
      id: `local-${ws}`,
      user_id: userId,
      week_start: local.week_start,
      answers: local.answers,
      completed_at: local.completed_at,
      created_at: local.completed_at,
    };
  }
}

export function parseWeeklyAnswers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((a) => String(a));
}
