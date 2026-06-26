import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  DEFAULT_LIFE_WEEKS_SETTINGS,
  type LifeWeeksSettings,
  computeLifePhaseStats,
  computeLifeWeekIndex,
  formatBirthDateForInput,
  mergeLifeWeeksSettings,
  parseLifeWeeksSettingsFromLayout,
  parseUtcDateOnly,
  patchLayoutWithLifeWeeksSettings,
} from "@/lib/lifeWeeks";
import {
  CELL,
  GRID_H,
  GRID_W,
  MARGIN_LEFT,
  MARGIN_TOP,
  colX,
  focusedViewBoxForWeek,
  rowY,
  weekIndexToGridPos,
  type ZoomMode,
} from "@/lib/lifeWeeksGrid";

export type LifeWeeksStageDraft = {
  retirementAge: string;
  collegeStartAge: string;
  collegeEndAge: string;
  collegeStartDate: string;
  collegeEndDate: string;
};

function todayIsoMax(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useLifeWeeksPanel({ defaultZoom }: { defaultZoom?: ZoomMode } = {}) {
  const { user, profile, updateProfile } = useAuth();
  const { showHubShell } = useAppShellMode();
  const [now, setNow] = useState(() => Date.now());
  const [draftDob, setDraftDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [missingDobColumn, setMissingDobColumn] = useState(false);
  const [zoom, setZoom] = useState<ZoomMode>(defaultZoom ?? (showHubShell ? "now" : 1));
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const [showStageSettings, setShowStageSettings] = useState(false);
  const dobMax = todayIsoMax();

  const zoomIn = () => {
    setZoom((z) => {
      if (z === "fit" || z === "now") return 1;
      if (z === 1) return 1.5;
      if (z === 1.5) return 2;
      return 3;
    });
  };

  const zoomOut = () => {
    setZoom((z) => {
      if (z === 3) return 2;
      if (z === 2) return 1.5;
      if (z === 1.5) return 1;
      if (z === 1) return "now";
      return "fit";
    });
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const dobRaw = profile?.date_of_birth;
  const dob = dobRaw != null && String(dobRaw).trim() !== "" ? String(dobRaw).trim() : null;

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      const { error } = await supabase.from("profiles").select("date_of_birth").eq("user_id", user.id).limit(1);
      if (cancelled || !error) return;
      const code = "code" in error && error.code != null ? String(error.code) : "";
      const msg = error.message ?? "";
      if (
        code === "42703" ||
        /column\s+[^\s]+\s+date_of_birth\s+does not exist/i.test(msg) ||
        /column\s+.*date_of_birth.*does not exist/i.test(msg)
      ) {
        setMissingDobColumn(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    setDraftDob(formatBirthDateForInput(dob));
  }, [dob]);

  const indexState = useMemo(() => {
    if (!dob) return null;
    return computeLifeWeekIndex(dob, now);
  }, [dob, now]);

  const lifeWeeksSettings = useMemo(
    () => parseLifeWeeksSettingsFromLayout(profile?.layout),
    [profile?.layout],
  );

  const mergedStageSettings = useMemo(
    () => mergeLifeWeeksSettings(lifeWeeksSettings),
    [lifeWeeksSettings],
  );

  const phaseStats = useMemo(() => {
    if (!dob) return null;
    return computeLifePhaseStats(dob, now, lifeWeeksSettings);
  }, [dob, now, lifeWeeksSettings]);

  const [stageDraft, setStageDraft] = useState<LifeWeeksStageDraft>({
    retirementAge: String(DEFAULT_LIFE_WEEKS_SETTINGS.retirementAge),
    collegeStartAge: String(DEFAULT_LIFE_WEEKS_SETTINGS.collegeStartAge),
    collegeEndAge: String(DEFAULT_LIFE_WEEKS_SETTINGS.collegeEndAge),
    collegeStartDate: "",
    collegeEndDate: "",
  });

  useEffect(() => {
    setStageDraft({
      retirementAge: String(mergedStageSettings.retirementAge),
      collegeStartAge: String(mergedStageSettings.collegeStartAge),
      collegeEndAge: String(mergedStageSettings.collegeEndAge),
      collegeStartDate: mergedStageSettings.collegeStartDate ?? "",
      collegeEndDate: mergedStageSettings.collegeEndDate ?? "",
    });
  }, [
    mergedStageSettings.retirementAge,
    mergedStageSettings.collegeStartAge,
    mergedStageSettings.collegeEndAge,
    mergedStageSettings.collegeStartDate,
    mergedStageSettings.collegeEndDate,
  ]);

  const onSaveStageSettings = async () => {
    const retirementAge = Number(stageDraft.retirementAge);
    const collegeStartAge = Number(stageDraft.collegeStartAge);
    const collegeEndAge = Number(stageDraft.collegeEndAge);
    if (
      !Number.isFinite(retirementAge) ||
      !Number.isFinite(collegeStartAge) ||
      !Number.isFinite(collegeEndAge) ||
      retirementAge <= 18 ||
      retirementAge > 120 ||
      collegeStartAge < 0 ||
      collegeEndAge <= collegeStartAge
    ) {
      toast({
        variant: "destructive",
        title: "Check life-stage values",
        description: "Retirement after 18; college end after college start.",
      });
      return;
    }
    const patch: LifeWeeksSettings = {
      retirementAge: Math.round(retirementAge),
      collegeStartAge: Math.round(collegeStartAge),
      collegeEndAge: Math.round(collegeEndAge),
      collegeStartDate: stageDraft.collegeStartDate.trim() || null,
      collegeEndDate: stageDraft.collegeEndDate.trim() || null,
    };
    setSaving(true);
    try {
      const { error } = await updateProfile({
        layout: patchLayoutWithLifeWeeksSettings(profile?.layout ?? "{}", patch),
      });
      if (error) {
        toast({ variant: "destructive", title: "Could not save", description: error.message });
        return;
      }
      toast({ title: "Life-stage settings saved" });
      setShowStageSettings(false);
    } finally {
      setSaving(false);
    }
  };

  const svgViewBox = useMemo(() => {
    if (zoom === "now" && indexState) return focusedViewBoxForWeek(indexState.currentWeekIndex);
    return `0 0 ${GRID_W} ${GRID_H}`;
  }, [zoom, indexState]);

  const viewBoxSize = useMemo(() => {
    const parts = svgViewBox.split(/\s+/).map(Number);
    return { w: parts[2] ?? GRID_W, h: parts[3] ?? GRID_H };
  }, [svgViewBox]);

  const boundedGridView = zoom === "fit" || zoom === "now";

  useEffect(() => {
    if (zoom === "fit" || zoom === "now" || !indexState) return;
    const el = gridScrollRef.current;
    if (!el) return;
    const { row, col } = weekIndexToGridPos(indexState.currentWeekIndex);
    const cellCenterX = (MARGIN_LEFT + colX(col) + CELL / 2) * zoom;
    const cellCenterY = (MARGIN_TOP + rowY(row) + CELL / 2) * zoom;
    const targetLeft = Math.max(0, cellCenterX - el.clientWidth / 2);
    const targetTop = Math.max(0, cellCenterY - el.clientHeight / 2);
    el.scrollTo({ left: targetLeft, top: targetTop, behavior: "smooth" });
  }, [zoom, indexState]);

  const onSaveDob = async () => {
    const parsed = parseUtcDateOnly(draftDob);
    if (parsed === null) {
      toast({ variant: "destructive", title: "Use a valid date", description: "Format YYYY-MM-DD." });
      return;
    }
    const y = new Date(parsed).getUTCFullYear();
    if (y < 1900 || y > new Date().getUTCFullYear()) {
      toast({ variant: "destructive", title: "Check the year", description: "Birth year looks invalid." });
      return;
    }
    const ymd = draftDob.trim();
    setSaving(true);
    try {
      const { error } = await updateProfile({ date_of_birth: ymd });
      if (error) {
        toast({
          variant: "destructive",
          title: "Could not save birthdate",
          description: error.message,
        });
        return;
      }
      toast({ title: "Birthdate saved" });
    } finally {
      setSaving(false);
    }
  };

  const cardClass = showHubShell
    ? "rounded-xl border border-border/60 bg-card shadow-sm"
    : "rounded-2xl border border-zinc-300/80 bg-[#f7f4ec] text-zinc-900 shadow-sm dark:border-zinc-600/80 dark:bg-[#1c1917] dark:text-zinc-100";

  return {
    showHubShell,
    missingDobColumn,
    dob,
    draftDob,
    setDraftDob,
    dobMax,
    indexState,
    phaseStats,
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
    gridScrollRef,
    showStageSettings,
    setShowStageSettings,
    stageDraft,
    setStageDraft,
    saving,
    onSaveDob,
    onSaveStageSettings,
    svgViewBox,
    viewBoxSize,
    boundedGridView,
    cardClass,
    gridW: GRID_W,
    gridH: GRID_H,
  };
}
