import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { isLocalModeNotified } from "@/lib/livingHope/livingHopeLocalStore";
import { getOrCreateWorkbook, saveWorkbook } from "@/lib/livingHope/workbookApi";
import type { LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";

export function useLivingHopeWorkbook(userId: string | undefined) {
  const [busy, setBusy] = useState(true);
  const [workbook, setWorkbook] = useState<LivingHopeWorkbookContent | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      const wb = await getOrCreateWorkbook(userId);
      setWorkbook(wb);
      if (isLocalModeNotified()) {
        toast({
          title: "Saving on this device",
          description:
            "Morning formula tables are not in Supabase yet. Your workbook is stored locally until migrations are applied.",
        });
      }
    } catch (e) {
      toast({
        title: "Couldn't load workbook",
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

  const persist = useCallback(
    (next: LivingHopeWorkbookContent) => {
      if (!userId) return;
      setWorkbook(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveWorkbook(userId, next).catch((e) => {
          toast({
            title: "Couldn't save",
            description: e instanceof Error ? e.message : "Try again.",
            variant: "destructive",
          });
        });
      }, 700);
    },
    [userId],
  );

  const update = useCallback(
    (patch: Partial<LivingHopeWorkbookContent>) => {
      setWorkbook((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { busy, workbook, load, update, setWorkbook: persist };
}
