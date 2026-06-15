import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLivingHope } from "@/hooks/useLivingHope";
import { useLivingHopeWorkbook } from "@/hooks/useLivingHopeWorkbook";
import { getMorningFormulaEntryTarget } from "@/lib/livingHope/morningFormulaEntry";
import { getMorningRitualDraftSummary } from "@/lib/livingHope/morningRitualDraft";
import { getWorkbookReadiness } from "@/lib/livingHope/workbookProgress";

export function useMorningFormulaEntry() {
  const { user } = useAuth();
  const { letter, goals, todayReview } = useLivingHope(user?.id);
  const { workbook } = useLivingHopeWorkbook(user?.id);

  const { ritualReady } = getWorkbookReadiness(workbook, goals, letter);
  const draftSummary = useMemo(() => getMorningRitualDraftSummary(user?.id), [user?.id]);

  const entry = useMemo(
    () =>
      getMorningFormulaEntryTarget({
        ritualReady,
        reviewedToday: !!todayReview,
        draft: draftSummary,
      }),
    [ritualReady, todayReview, draftSummary],
  );

  return { entry, ritualReady, draftSummary, reviewedToday: !!todayReview };
}
