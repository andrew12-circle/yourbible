import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { isLocalModeNotified } from "@/lib/livingHope/livingHopeLocalStore";
import { getOrCreateWorkbook, saveWorkbookPatch } from "@/lib/livingHope/workbookApi";
import type { LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";

function changedWorkbookFields(
  prev: LivingHopeWorkbookContent,
  next: LivingHopeWorkbookContent,
): Partial<LivingHopeWorkbookContent> {
  const patch: Partial<LivingHopeWorkbookContent> = {};
  for (const key of Object.keys(next) as Array<keyof LivingHopeWorkbookContent>) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key])) {
      (patch as Record<string, unknown>)[key] = next[key];
    }
  }
  return patch;
}

export function useLivingHopeWorkbook(userId: string | undefined) {
  const [busy, setBusy] = useState(true);
  const [workbook, setWorkbookState] = useState<LivingHopeWorkbookContent | null>(null);
  const serverWorkbook = useRef<LivingHopeWorkbookContent | null>(null);
  const pendingPatch = useRef<Partial<LivingHopeWorkbookContent>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      const wb = await getOrCreateWorkbook(userId);
      serverWorkbook.current = wb;
      pendingPatch.current = {};
      setWorkbookState(wb);
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

  const schedulePatch = useCallback(
    (patch: Partial<LivingHopeWorkbookContent>) => {
      if (!userId || Object.keys(patch).length === 0) return;
      pendingPatch.current = { ...pendingPatch.current, ...patch };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        const patchToSave = pendingPatch.current;
        pendingPatch.current = {};
        const base = serverWorkbook.current;

        void saveWorkbookPatch(userId, patchToSave, base)
          .then((saved) => {
            serverWorkbook.current = saved;
            // If nothing newer is waiting locally, adopt the merged server copy.
            // This is what makes remote scene additions appear after a stale-tab save.
            if (Object.keys(pendingPatch.current).length === 0) {
              setWorkbookState(saved);
            }
          })
          .catch((e) => {
            pendingPatch.current = { ...patchToSave, ...pendingPatch.current };
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
      setWorkbookState((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        schedulePatch(patch);
        return next;
      });
    },
    [schedulePatch],
  );

  const setWorkbook = useCallback(
    (next: LivingHopeWorkbookContent) => {
      setWorkbookState((prev) => {
        if (!prev) {
          schedulePatch(next);
          return next;
        }
        schedulePatch(changedWorkbookFields(prev, next));
        return next;
      });
    },
    [schedulePatch],
  );

  return { busy, workbook, load, update, setWorkbook };
}
