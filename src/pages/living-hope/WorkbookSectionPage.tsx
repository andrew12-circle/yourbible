import { useCallback, useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LivingHopeChrome } from "@/components/living-hope/LivingHopeChrome";
import { WorkbookSectionEditor } from "@/components/living-hope/WorkbookSectionEditor";
import { useLivingHopeWorkbook } from "@/hooks/useLivingHopeWorkbook";
import { getWeeklyReview, parseWeeklyAnswers, saveWeeklyReview } from "@/lib/livingHope/workbookApi";
import { WORKBOOK_SECTIONS, weekStartISO, type WorkbookSection } from "@/lib/livingHope/workbookTypes";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

const VALID_SECTIONS = new Set(WORKBOOK_SECTIONS.map((section) => section.key));

export default function WorkbookSectionPage() {
  const { section: sectionParam } = useParams<{ section: string }>();
  const { user, loading } = useAuth();
  const { busy, workbook, setWorkbook } = useLivingHopeWorkbook(user?.id);
  const [weeklyAnswers, setWeeklyAnswers] = useState<string[]>([]);
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [savingWeekly, setSavingWeekly] = useState(false);
  const section = VALID_SECTIONS.has(sectionParam as WorkbookSection) ? sectionParam as WorkbookSection : null;
  const meta = WORKBOOK_SECTIONS.find((item) => item.key === section);

  useEffect(() => {
    if (!user?.id || section !== "weekly") return;
    void getWeeklyReview(user.id).then((row) => { if (row) setWeeklyAnswers(parseWeeklyAnswers(row.answers)); });
  }, [user?.id, section]);
  useEffect(() => {
    if (workbook && section === "weekly" && !weeklyAnswers.length) setWeeklyAnswers(workbook.weekly_questions.map(() => ""));
  }, [workbook, section, weeklyAnswers.length]);
  const saveWeekly = useCallback(async () => {
    if (!user?.id) return;
    setSavingWeekly(true);
    try { await saveWeeklyReview(user.id, weeklyAnswers); toast({ title: "Weekly review saved" }); }
    catch (error) { toast({ title: "Couldn't save", description: error instanceof Error ? error.message : "Try again.", variant: "destructive" }); }
    finally { setSavingWeekly(false); }
  }, [user?.id, weeklyAnswers]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!section || !meta) return <Navigate to="/living-hope" replace />;
  const isSunday = new Date().getDay() === 0;
  return <LivingHopeChrome backTo="/living-hope" title={meta.label} subtitle={meta.hint}>
    {busy || !workbook ? <div className="flex min-h-48 items-center justify-center"><Loader2 className={cn("h-6 w-6 animate-spin", lh.spinner)} /></div>
      : <div className="morning-workbook-fields space-y-5">
        {section === "weekly" && !isSunday && <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">Best on Sunday — week of {weekStartISO()}</p>}
        <WorkbookSectionEditor section={section} workbook={workbook} onChange={setWorkbook} weeklyAnswers={weeklyAnswers} onWeeklyAnswersChange={setWeeklyAnswers} metricValues={metricValues} onMetricValuesChange={setMetricValues} />
        {section === "weekly" && <Button className={lh.btnPrimary} disabled={savingWeekly} onClick={() => void saveWeekly()}>{savingWeekly ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save weekly review"}</Button>}
      </div>}
  </LivingHopeChrome>;
}
