import { useCallback, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";
import {
  countReviewStreak,
  createGoal,
  deleteGoal,
  getOrCreateLetter,
  getTodayReview,
  listGoals,
  openLetter,
  sealLetter,
  updateGoal,
  updateLetter,
  type LivingHopeGoalRow,
  type LivingHopeLetterRow,
  type LivingHopeReviewRow,
} from "@/lib/livingHope/api";
import { isLocalModeNotified } from "@/lib/livingHope/livingHopeLocalStore";
import { defaultLetterTitle } from "@/lib/livingHope/letterSections";

export function useLivingHope(userId: string | undefined) {
  const [busy, setBusy] = useState(true);
  const [letter, setLetter] = useState<LivingHopeLetterRow | null>(null);
  const [goals, setGoals] = useState<LivingHopeGoalRow[]>([]);
  const [todayReview, setTodayReview] = useState<LivingHopeReviewRow | null>(null);
  const [streak, setStreak] = useState(0);

  const load = useCallback(async () => {
    if (!userId) {
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      const [ltr, rev, str] = await Promise.all([
        getOrCreateLetter(userId),
        getTodayReview(userId),
        countReviewStreak(userId),
      ]);
      setLetter(ltr);
      setTodayReview(rev);
      setStreak(str);
      const g = await listGoals(userId, ltr.id);
      setGoals(g);
      if (isLocalModeNotified()) {
        toast({
          title: "Saving on this device",
          description:
            "Morning formula database tables are not set up yet. Data is stored locally until you run Supabase migrations.",
        });
      }
    } catch (e) {
      toast({
        title: "Couldn't load Morning formula",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveLetterField = useCallback(
    async (patch: Partial<LivingHopeLetterRow>) => {
      if (!letter) return;
      try {
        const updated = await updateLetter(letter.id, patch);
        setLetter(updated);
      } catch (e) {
        toast({
          title: "Couldn't save",
          description: e instanceof Error ? e.message : "Try again.",
          variant: "destructive",
        });
      }
    },
    [letter],
  );

  const setTimeframe = useCallback(
    async (years: number) => {
      if (!letter || letter.status !== "draft") return;
      await saveLetterField({
        timeframe_years: years,
        title: defaultLetterTitle(years),
      });
    },
    [letter, saveLetterField],
  );

  const seal = useCallback(async () => {
    if (!letter) return;
    try {
      const updated = await sealLetter(letter);
      setLetter(updated);
      toast({ title: "Letter sealed", description: "Open it when the time comes — keep reviewing each morning." });
    } catch (e) {
      toast({
        title: "Couldn't seal letter",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    }
  }, [letter]);

  const unlock = useCallback(async () => {
    if (!letter) return;
    try {
      const updated = await openLetter(letter.id);
      setLetter(updated);
      toast({ title: "Letter opened", description: "Read what past-you wrote." });
    } catch (e) {
      toast({
        title: "Couldn't open letter",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    }
  }, [letter]);

  const addGoal = useCallback(
    async (input: { title: string; domain?: LivingHopeGoalRow["domain"]; vivid_detail?: string }) => {
      if (!userId || !letter) return;
      try {
        const g = await createGoal(userId, {
          letter_id: letter.id,
          title: input.title,
          domain: input.domain,
          vivid_detail: input.vivid_detail,
          sort_order: goals.length,
        });
        setGoals((prev) => [...prev, g]);
      } catch (e) {
        toast({
          title: "Couldn't add goal",
          description: e instanceof Error ? e.message : "Try again.",
          variant: "destructive",
        });
      }
    },
    [userId, letter, goals.length],
  );

  const patchGoal = useCallback(async (id: string, patch: Partial<LivingHopeGoalRow>) => {
    try {
      const updated = await updateGoal(id, patch);
      setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
    } catch (e) {
      toast({
        title: "Couldn't update goal",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    }
  }, []);

  const removeGoal = useCallback(async (id: string) => {
    try {
      await deleteGoal(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
    } catch (e) {
      toast({
        title: "Couldn't delete goal",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    }
  }, []);

  return {
    busy,
    letter,
    goals,
    todayReview,
    streak,
    load,
    saveLetterField,
    setTimeframe,
    seal,
    unlock,
    addGoal,
    patchGoal,
    removeGoal,
    setTodayReview,
  };
}
