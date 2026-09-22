import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { edgeFunctionErrorMessage } from "@/lib/supabase/edgeFunctions";
import { API_BIBLE_CSB_ID } from "@/lib/bible/bibleEditions";
import {
  BUNDLED_BIBLE_REMOTE_SERVICE_ERROR,
  usesBundledBible,
} from "@/lib/bible/remoteBibleService";
import {
  findNextReadingPlanDay,
  primaryReadingForPlanDay,
  type NextReadingPlanDay,
} from "@/lib/bible/readingPlanProgress";
import { readerPath } from "@/lib/bible/reference";
import { getStoredBibleId } from "@/lib/bible/storedBibleId";
import { localDateISO } from "@/lib/lifePriorities";

export interface MorningDailyReading {
  id: string;
  reference: string;
  passage: string;
  reason: string;
  prompt: string;
}

export type MorningScriptureSource = "reading-plan" | "daily";

export interface MorningScripture {
  source: MorningScriptureSource;
  reference: string;
  readerHref: string;
  passage?: string;
  reason?: string;
  prompt?: string;
  planTitle?: string;
  planDayLabel?: string;
  planDay?: NextReadingPlanDay;
}

function readerHrefForPlanDay(day: NextReadingPlanDay): string {
  const first = primaryReadingForPlanDay(day);
  if (!first) return "/read/Jhn/1";
  return `/read/${first.book}/${first.chapter}`;
}

export function useMorningScripture(userId: string | undefined) {
  const [planDay, setPlanDay] = useState<NextReadingPlanDay | null>(null);
  const [daily, setDaily] = useState<MorningDailyReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const today = localDateISO();

  const loadPlanProgress = useCallback(async () => {
    if (!userId) return null;
    const { data, error: progressError } = await supabase
      .from("reading_plan_progress")
      .select("plan_id, day_index")
      .eq("user_id", userId);
    if (progressError) throw progressError;

    const progress = ((data ?? []) as { plan_id: string; day_index: number }[]).slice();

    // Reconcile completed prior Morning Formula reviews with plan progress.
    // This repairs days completed before plan-day saving was wired into Morning Formula.
    const { data: reviews } = await supabase
      .from("living_hope_reviews")
      .select("review_date, connection_notes")
      .eq("user_id", userId)
      .lt("review_date", today)
      .order("review_date", { ascending: false })
      .limit(14);

    const completedRefs = new Set(
      (reviews ?? [])
        .map((row) => {
          const notes = row.connection_notes;
          if (!notes || typeof notes !== "object" || Array.isArray(notes)) return "";
          const ref = (notes as Record<string, unknown>).scripture_ref;
          return typeof ref === "string" ? ref.trim() : "";
        })
        .filter(Boolean),
    );

    let next = findNextReadingPlanDay(progress);
    while (next && completedRefs.has(next.referenceLabel)) {
      const { error: repairError } = await supabase.from("reading_plan_progress").upsert(
        {
          user_id: userId,
          plan_id: next.plan.id,
          day_index: next.dayIndex,
        },
        { onConflict: "user_id,plan_id,day_index" },
      );
      if (repairError) break;
      progress.push({ plan_id: next.plan.id, day_index: next.dayIndex });
      next = findNextReadingPlanDay(progress);
    }

    setPlanDay(next);
    return next;
  }, [userId, today]);

  const loadDaily = useCallback(async () => {
    if (!userId) return null;
    const { data } = await supabase
      .from("daily_readings")
      .select("id, reference, passage, reason, prompt")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();
    const row = data as MorningDailyReading | null;
    setDaily(row);
    return row;
  }, [userId, today]);

  const load = useCallback(async () => {
    if (!userId) return null;
    setLoading(true);
    setError(null);
    try {
      const nextPlan = await loadPlanProgress();
      if (nextPlan) return { source: "reading-plan" as const, planDay: nextPlan };
      const row = await loadDaily();
      return row ? { source: "daily" as const, daily: row } : null;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load scripture");
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId, loadPlanProgress, loadDaily]);

  const generateDaily = useCallback(async () => {
    if (!userId) return null;
    const bibleId = getStoredBibleId() ?? API_BIBLE_CSB_ID;
    if (usesBundledBible(bibleId)) {
      setError(BUNDLED_BIBLE_REMOTE_SERVICE_ERROR);
      return null;
    }
    setGenerating(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("framework-daily", {
        body: { bibleId },
      });
      if (fnError) throw fnError;
      if (data && typeof data === "object" && "error" in data && data.error) {
        throw new Error(String(data.error));
      }
      return await loadDaily();
    } catch (e: unknown) {
      const msg = await edgeFunctionErrorMessage("framework-daily", e);
      setError(msg);
      return null;
    } finally {
      setGenerating(false);
    }
  }, [userId, loadDaily]);

  const completeCurrentPlanDay = useCallback(async () => {
    if (!userId || !planDay) return false;
    const { error: progressError } = await supabase.from("reading_plan_progress").upsert(
      {
        user_id: userId,
        plan_id: planDay.plan.id,
        day_index: planDay.dayIndex,
      },
      { onConflict: "user_id,plan_id,day_index" },
    );
    if (progressError) throw progressError;

    // Advance immediately in the Morning Formula so returning from the Bible
    // cannot serve the same plan day again.
    await loadPlanProgress();
    return true;
  }, [userId, planDay, loadPlanProgress]);

  const ensureScripture = useCallback(async () => {
    const nextPlan = planDay ?? (await loadPlanProgress());
    if (nextPlan) return { source: "reading-plan" as const, planDay: nextPlan };

    const existingDaily = daily ?? (await loadDaily());
    if (existingDaily) return { source: "daily" as const, daily: existingDaily };

    if (autoStarted.current) return null;
    autoStarted.current = true;
    const generated = await generateDaily();
    return generated ? { source: "daily" as const, daily: generated } : null;
  }, [planDay, daily, loadPlanProgress, loadDaily, generateDaily]);

  useEffect(() => {
    if (!userId) return;
    void load();
  }, [userId, load]);

  const scripture: MorningScripture | null = planDay
    ? {
        source: "reading-plan",
        reference: planDay.referenceLabel,
        readerHref: readerHrefForPlanDay(planDay),
        reason: `Reading plan · ${planDay.plan.title} — day ${planDay.dayIndex} of ${planDay.plan.days}`,
        prompt: "What does this passage teach you about God today?",
        planTitle: planDay.plan.title,
        planDayLabel: planDay.dayTitle,
        planDay,
      }
    : daily
      ? {
          source: "daily",
          reference: daily.reference,
          readerHref: readerPath(daily.reference),
          passage: daily.passage,
          reason: daily.reason,
          prompt: daily.prompt,
        }
      : null;

  return {
    scripture,
    planDay,
    daily,
    loading,
    generating,
    busy: loading || generating,
    error,
    load,
    generateDaily,
    ensureScripture,
    completeCurrentPlanDay,
  };
}
