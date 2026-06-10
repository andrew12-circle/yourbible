import { useCallback, useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LivingHopeChrome } from "@/components/living-hope/LivingHopeChrome";
import { WorkbookSectionEditor } from "@/components/living-hope/WorkbookSectionEditor";
import { useLivingHopeWorkbook } from "@/hooks/useLivingHopeWorkbook";
import {
  getWeeklyReview,
  parseWeeklyAnswers,
  saveWeeklyReview,
} from "@/lib/livingHope/workbookApi";
import {
  WORKBOOK_SECTIONS,
  weekStartISO,
  type WorkbookSection,
} from "@/lib/livingHope/workbookTypes";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const VALID_SECTIONS = new Set(WORKBOOK_SECTIONS.map((s) => s.key));

export default function WorkbookSectionPage() {
  const { section: sectionParam } = useParams<{ section: string }>();
  const { user, loading } = useAuth();
  const { busy, workbook, setWorkbook } = useLivingHopeWorkbook(user?.id);
  const [weeklyAnswers, setWeeklyAnswers] = useState<string[]>([]);
  const [metricValues, setMetricValues] = useState<Record<string, string>>({});
  const [savingWeekly, setSavingWeekly] = useState(false);

  const section = VALID_SECTIONS.has(sectionParam as WorkbookSection)
    ? (sectionParam as WorkbookSection)
    : null;
  const meta = WORKBOOK_SECTIONS.find((s) => s.key === section);

  useEffect(() => {
    if (!user?.id || section !== "weekly") return;
    void getWeeklyReview(user.id).then((row) => {
      if (row) setWeeklyAnswers(parseWeeklyAnswers(row.answers));
    });
  }, [user?.id, section]);

  useEffect(() => {
    if (workbook && section === "weekly" && !weeklyAnswers.length) {
      setWeeklyAnswers(workbook.weekly_questions.map(() => ""));
    }
  }, [workbook, section, weeklyAnswers.length]);

  const saveWeekly = useCallback(async () => {
    if (!user?.id) return;
    setSavingWeekly(true);
    try {
      await saveWeeklyReview(user.id, weeklyAnswers);
      toast({ title: "Weekly review saved" });
    } catch (e) {
      toast({
        title: "Couldn't save",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setSavingWeekly(false);
    }
  }, [user?.id, weeklyAnswers]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!section || !meta) return <Navigate to="/living-hope" replace />;

  const isSunday = new Date().getDay() === 0;

  return (
    <LivingHopeChrome backTo="/living-hope" subtitle={meta.hint}>
      <style>{`.field-input{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:white}`}</style>
      {busy || !workbook ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-hide py-2 space-y-4">
          <h1 className="font-display text-xl text-white">{meta.label}</h1>
          {section === "weekly" && !isSunday ? (
            <p className="text-[13px] text-amber-200/70 rounded-xl bg-amber-400/10 px-3 py-2">
              Best on Sunday — week of {weekStartISO()}
            </p>
          ) : null}
          <WorkbookSectionEditor
            section={section}
            workbook={workbook}
            onChange={setWorkbook}
            weeklyAnswers={weeklyAnswers}
            onWeeklyAnswersChange={setWeeklyAnswers}
            metricValues={metricValues}
            onMetricValuesChange={setMetricValues}
          />
          {section === "weekly" ? (
            <Button
              className="w-full rounded-xl bg-amber-400 text-amber-950 hover:bg-amber-300"
              disabled={savingWeekly}
              onClick={() => void saveWeekly()}
            >
              {savingWeekly ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save weekly review"}
            </Button>
          ) : null}
        </div>
      )}
    </LivingHopeChrome>
  );
}
