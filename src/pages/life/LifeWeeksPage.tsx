import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { HubPageLayout } from "@/components/shell/HubPageLayout";
import { LifePrioritiesPanel } from "@/components/home/LifePrioritiesPanel";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Loader2, Maximize2, Minus, Plus } from "lucide-react";
import {
  DEFAULT_LIFE_WEEKS_SETTINGS,
  LIFE_WEEKS_TOTAL,
  type LifePhaseStats,
  type LifeWeekIndexResult,
  type LifeWeeksSettings,
  computeLifePhaseStats,
  computeLifeWeekIndex,
  formatBirthDateForInput,
  getCurrentWeekDisplay,
  mergeLifeWeeksSettings,
  parseLifeWeeksSettingsFromLayout,
  parseUtcDateOnly,
  patchLayoutWithLifeWeeksSettings,
} from "@/lib/lifeWeeks";
import { toast } from "@/hooks/use-toast";

const APP_TAGLINE = "Sacred & Modern";

/** Poster card: consistent on light/dark backgrounds */
const POSTER_CLASS =
  "rounded-2xl border border-zinc-300/80 bg-[#f7f4ec] text-zinc-900 shadow-sm dark:border-zinc-600/80 dark:bg-[#1c1917] dark:text-zinc-100";

const CELL = 12;
const GAP = 2;
const COL_GROUP_GAP = 3;
const DECADE_ROW_GAP = 6;
const MARGIN_TOP = 32;
const MARGIN_LEFT = 36;
const LABEL_SIZE = 11;

function colX(c: number): number {
  return c * (CELL + GAP) + Math.floor(c / 5) * COL_GROUP_GAP;
}

function rowY(r: number): number {
  return r * (CELL + GAP) + Math.floor(r / 10) * DECADE_ROW_GAP;
}

const GRID_W = MARGIN_LEFT + colX(51) + CELL + 12;
const GRID_H = MARGIN_TOP + rowY(119) + CELL + 28;

const WEEK_TICKS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 52] as const;
const AGE_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120] as const;

function todayIsoMax(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function StatPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs tabular-nums",
        highlight
          ? "border-primary/40 bg-primary/10 font-semibold"
          : "border-zinc-300/80 bg-white/60 dark:border-zinc-600/80 dark:bg-zinc-900/50",
      )}
    >
      <span className="text-muted-foreground dark:text-zinc-400">{label}</span>{" "}
      <span className={cn("font-semibold", highlight && "text-foreground")}>{value}</span>
    </div>
  );
}

type ZoomMode = "fit" | "now" | 1 | 1.5 | 2 | 3;

function focusedViewBoxForWeek(currentWeekIndex: number): string {
  const currentRow = Math.floor(currentWeekIndex / 52);
  const minRow = Math.max(0, currentRow - 2);
  const maxRow = Math.min(119, currentRow + 5);
  const y0 = MARGIN_TOP + rowY(minRow) - 14;
  const y1 = MARGIN_TOP + rowY(maxRow) + CELL + 28;
  return `0 ${y0} ${GRID_W} ${y1 - y0}`;
}

function CurrentWeekHero({
  stats,
  indexState,
}: {
  stats: LifePhaseStats;
  indexState: LifeWeekIndexResult;
}) {
  const fmt = (n: number) => n.toLocaleString();
  const { weekNumber, ageYear, weekOfYear } = getCurrentWeekDisplay(indexState.currentWeekIndex);
  const weekCol = indexState.currentWeekIndex % 52;

  return (
    <div className="rounded-xl border border-primary/30 bg-card px-4 py-4 md:px-5 md:py-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            This week
          </p>
          <p className="mt-1 text-4xl md:text-5xl font-bold tabular-nums tracking-tight text-foreground">
            Week {fmt(weekNumber)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            Age {ageYear} · Week {weekOfYear} of 52 · {fmt(LIFE_WEEKS_TOTAL)} total
          </p>
        </div>
        <div className="sm:text-right shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Time left
          </p>
          <p className="mt-1 text-2xl md:text-3xl font-bold tabular-nums tracking-tight">
            {fmt(stats.weeksRemaining)}
            <span className="ml-1.5 text-sm md:text-base font-semibold text-muted-foreground">weeks</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground tabular-nums">
            {fmt(stats.weeksLived)} lived · {stats.pctOfLifespan.toFixed(1)}%
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-0.5 w-full" aria-label={`Year ${ageYear}: week ${weekOfYear} of 52`}>
        {Array.from({ length: 52 }, (_, c) => {
          const isPast = c < weekCol;
          const isCurrent = c === weekCol;
          return (
            <div
              key={c}
              className={cn(
                "h-2 min-w-0 flex-1 rounded-[2px]",
                isPast && "bg-foreground",
                !isPast && !isCurrent && "border border-foreground/35 bg-transparent",
                isCurrent && "bg-foreground ring-2 ring-primary ring-offset-1 ring-offset-card",
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

function LifeStatsBar({ stats }: { stats: LifePhaseStats }) {
  const fmt = (n: number) => n.toLocaleString();
  return (
    <div
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin"
      aria-label="Life week statistics"
    >
      <StatPill label="Lived" value={`${fmt(stats.weeksLived)} wks`} />
      <StatPill label="Left" value={`${fmt(stats.weeksRemaining)} wks`} highlight />
      <StatPill label="Lifespan" value={`${stats.pctOfLifespan.toFixed(1)}%`} />
      <StatPill label="With control" value={`${fmt(stats.controlWeeksLived)} wks`} />
      <StatPill
        label="College"
        value={`${fmt(stats.collegeWeeksLived)}/${fmt(stats.collegeWeeksTotal)} wks`}
      />
      <StatPill label="Working" value={`${fmt(stats.workingWeeksLived)} wks`} />
      <StatPill label="To retire" value={`${fmt(stats.weeksUntilRetirement)} wks`} />
      <StatPill label="Enjoy left" value={`${fmt(stats.enjoyWeeksRemaining)} wks`} />
    </div>
  );
}

type StageDraft = {
  retirementAge: string;
  collegeStartAge: string;
  collegeEndAge: string;
  collegeStartDate: string;
  collegeEndDate: string;
};

function LifeStageSettingsForm({
  draft,
  onChange,
  onSave,
  saving,
}: {
  draft: StageDraft;
  onChange: (next: StageDraft) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2 max-w-2xl border-t border-zinc-300/60 pt-3 dark:border-zinc-600/60">
      <div className="space-y-1">
        <Label htmlFor="lw-retire" className="text-xs text-muted-foreground">
          Retirement age
        </Label>
        <Input
          id="lw-retire"
          type="number"
          min={19}
          max={120}
          value={draft.retirementAge}
          onChange={(e) => onChange({ ...draft, retirementAge: e.target.value })}
          className="h-9 bg-white/80 dark:bg-zinc-900/80"
        />
      </div>
      <p className="space-y-1 sm:col-span-2 text-xs text-muted-foreground">
        College window — ages (default 18–22) or exact dates
      </p>
      <div className="space-y-1">
        <Label htmlFor="lw-col-start-age" className="text-xs text-muted-foreground">
          College from age
        </Label>
        <Input
          id="lw-col-start-age"
          type="number"
          min={0}
          max={119}
          value={draft.collegeStartAge}
          onChange={(e) => onChange({ ...draft, collegeStartAge: e.target.value })}
          className="h-9 bg-white/80 dark:bg-zinc-900/80"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="lw-col-end-age" className="text-xs text-muted-foreground">
          College until age
        </Label>
        <Input
          id="lw-col-end-age"
          type="number"
          min={1}
          max={120}
          value={draft.collegeEndAge}
          onChange={(e) => onChange({ ...draft, collegeEndAge: e.target.value })}
          className="h-9 bg-white/80 dark:bg-zinc-900/80"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="lw-col-start-d" className="text-xs text-muted-foreground">
          Or start date
        </Label>
        <Input
          id="lw-col-start-d"
          type="date"
          value={draft.collegeStartDate}
          onChange={(e) => onChange({ ...draft, collegeStartDate: e.target.value })}
          className="h-9 bg-white/80 dark:bg-zinc-900/80"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="lw-col-end-d" className="text-xs text-muted-foreground">
          Or end date
        </Label>
        <Input
          id="lw-col-end-d"
          type="date"
          value={draft.collegeEndDate}
          onChange={(e) => onChange({ ...draft, collegeEndDate: e.target.value })}
          className="h-9 bg-white/80 dark:bg-zinc-900/80"
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="button" size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save assumptions"}
        </Button>
      </div>
    </div>
  );
}

export default function LifeWeeksPage() {
  const { user, profile, loading, updateProfile } = useAuth();
  const { showHubShell } = useAppShellMode();
  const [now, setNow] = useState(() => Date.now());
  const [draftDob, setDraftDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [missingDobColumn, setMissingDobColumn] = useState(false);
  /**
   * Chart sizing modes:
   *  - "fit": preserve aspect ratio, bounded by viewport so the whole poster shows on one screen
   *  - number: explicit zoom multiplier of the SVG's native pixel size, container scrolls
   */
  const [zoom, setZoom] = useState<ZoomMode>(showHubShell ? "now" : 1);
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

  const [stageDraft, setStageDraft] = useState({
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

  const gridW = GRID_W;
  const gridH = GRID_H;

  const svgViewBox = useMemo(() => {
    if (zoom === "now" && indexState) return focusedViewBoxForWeek(indexState.currentWeekIndex);
    return `0 0 ${gridW} ${gridH}`;
  }, [zoom, indexState, gridW, gridH]);

  const viewBoxSize = useMemo(() => {
    const parts = svgViewBox.split(/\s+/).map(Number);
    return { w: parts[2] ?? gridW, h: parts[3] ?? gridH };
  }, [svgViewBox, gridW, gridH]);

  const boundedGridView = zoom === "fit" || zoom === "now";

  useEffect(() => {
    if (zoom === "fit" || zoom === "now" || !indexState) return;
    const el = gridScrollRef.current;
    if (!el) return;
    const row = Math.floor(indexState.currentWeekIndex / 52);
    const col = indexState.currentWeekIndex % 52;
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
    : POSTER_CLASS;

  const fitMaxHeight = showHubShell ? "min(58vh, calc(100dvh - 22rem))" : "calc(100dvh - 280px)";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin opacity-50" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const pageBody = (
      <div
        className={cn(
          "mx-auto w-full space-y-3 md:space-y-4",
          showHubShell ? "flex flex-col min-h-0 flex-1" : "max-w-5xl px-3 sm:px-4 pt-4",
        )}
      >
        {missingDobColumn && (
          <div
            role="alert"
            className="mx-auto max-w-lg rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100"
          >
            This database is missing{" "}
            <code className="rounded bg-black/10 px-1 py-0.5 text-xs dark:bg-white/10">profiles.date_of_birth</code>.
            Apply the latest migration (e.g.{" "}
            <code className="rounded bg-black/10 px-1 py-0.5 text-xs dark:bg-white/10">
              20260512240000_profiles_date_of_birth.sql
            </code>
            ) so birth dates can load and save.
          </div>
        )}
        {!dob && (
          <section className={`mx-auto max-w-lg p-4 sm:p-5 ${POSTER_CLASS}`}>
            <p className="text-sm leading-relaxed mb-3">
              Add your birthdate to see a 120-year week grid (6,240 weeks). It stays on your profile.
            </p>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="life-dob" className="text-xs uppercase tracking-wide text-muted-foreground">
                Birth date
              </Label>
              <Input
                id="life-dob"
                type="date"
                value={draftDob}
                max={dobMax}
                onChange={(e) => setDraftDob(e.target.value)}
                className="bg-white/80 dark:bg-zinc-900/80"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={onSaveDob} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save birthdate"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/settings">Open settings</Link>
              </Button>
            </div>
          </section>
        )}

        {dob && phaseStats && indexState && (
          <CurrentWeekHero stats={phaseStats} indexState={indexState} />
        )}

        {dob && !indexState && (
          <section className={`mx-auto max-w-lg p-4 sm:p-5 ${POSTER_CLASS}`}>
            <p className="text-sm text-muted-foreground">Could not compute weeks from this date. Try correcting it below.</p>
          </section>
        )}

        {dob && indexState && (
          <div className={cn("space-y-2", showHubShell && "flex flex-col flex-1 min-h-[280px]")}>
            <div className="flex items-center justify-end gap-1.5 px-1 shrink-0">
              <Button
                type="button"
                variant={zoom === "now" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setZoom("now")}
                aria-pressed={zoom === "now"}
                className="h-8 px-2.5"
              >
                This week
              </Button>
              <Button
                type="button"
                variant={zoom === "fit" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setZoom("fit")}
                aria-pressed={zoom === "fit"}
                className="h-8 gap-1.5 px-2.5"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Full life
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={zoomOut}
                disabled={zoom === "fit"}
                aria-label="Zoom out"
                className="h-8 w-8"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground w-12 text-center">
                {zoom === "fit" ? "full" : zoom === "now" ? "now" : `${zoom}×`}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={zoomIn}
                disabled={zoom === 3}
                aria-label="Zoom in"
                className="h-8 w-8"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div
              className={cn(
                "mx-auto w-full p-3 sm:p-4 md:p-5",
                cardClass,
                showHubShell ? "flex flex-1 min-h-0 flex-col overflow-hidden" : "overflow-auto",
              )}
            >
              {/*
                Grid sizing modes share one SVG:
                  - "now" / "fit": wrapper uses aspect-ratio + viewport bound; SVG is width/height "100%".
                  - zoom number: SVG gets pixel width/height; outer div scrolls in both axes.
              */}
              <div
                ref={gridScrollRef}
                className={cn(
                  boundedGridView
                    ? showHubShell
                      ? "flex flex-1 min-h-0 items-center justify-center"
                      : "mx-auto"
                    : "inline-block overflow-auto max-h-[min(58vh,calc(100dvh-18rem))]",
                )}
              >
              <div
                className={boundedGridView ? (showHubShell ? "h-full w-full max-h-full max-w-full" : "mx-auto") : undefined}
                style={
                  boundedGridView
                    ? {
                        aspectRatio: `${viewBoxSize.w} / ${viewBoxSize.h}`,
                        maxWidth: "100%",
                        maxHeight: showHubShell ? "100%" : fitMaxHeight,
                      }
                    : undefined
                }
              >
                <svg
                  role="img"
                  aria-label="My life in weeks: 120 rows by 52 columns"
                  viewBox={svgViewBox}
                  preserveAspectRatio="xMidYMid meet"
                  width={boundedGridView ? "100%" : gridW * zoom}
                  height={boundedGridView ? "100%" : gridH * zoom}
                  className="block text-zinc-900 dark:text-zinc-100"
                >
                <title>MY LIFE IN WEEKS</title>
                <text
                  x={gridW / 2}
                  y={20}
                  textAnchor="middle"
                  className="fill-current text-[13px] font-semibold tracking-[0.2em]"
                  style={{ fontVariantCaps: "small-caps" }}
                >
                  MY LIFE IN WEEKS
                </text>

                {WEEK_TICKS.map((w) => {
                  const col = w - 1;
                  const cx = MARGIN_LEFT + colX(col) + CELL / 2;
                  return (
                    <text
                      key={`wk-${w}`}
                      x={cx}
                      y={MARGIN_TOP - 6}
                      textAnchor="middle"
                      className="fill-current pointer-events-none"
                      style={{ fontSize: LABEL_SIZE }}
                    >
                      {w}
                    </text>
                  );
                })}

                {AGE_TICKS.map((age) => {
                  if (age === 120) {
                    const y = MARGIN_TOP + rowY(119) + CELL + 14;
                    return (
                      <text
                        key="age-120"
                        x={MARGIN_LEFT - 10}
                        y={y}
                        textAnchor="end"
                        dominantBaseline="middle"
                        className="fill-current pointer-events-none"
                        style={{ fontSize: LABEL_SIZE }}
                      >
                        120
                      </text>
                    );
                  }
                  const row = age;
                  const y = MARGIN_TOP + rowY(row) + CELL / 2;
                  return (
                    <text
                      key={`age-${age}`}
                      x={MARGIN_LEFT - 10}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="fill-current pointer-events-none"
                      style={{ fontSize: LABEL_SIZE }}
                    >
                      {age}
                    </text>
                  );
                })}

                {Array.from({ length: LIFE_WEEKS_TOTAL }, (_, i) => {
                  const row = Math.floor(i / 52);
                  const col = i % 52;
                  const x = MARGIN_LEFT + colX(col);
                  const y = MARGIN_TOP + rowY(row);
                  const isPast = i < indexState.currentWeekIndex;
                  const isCurrent = i === indexState.currentWeekIndex;
                  const isFuture = i > indexState.currentWeekIndex;

                  return (
                    <g key={i}>
                      {isPast && (
                        <rect x={x} y={y} width={CELL} height={CELL} className="fill-current" rx={0.5} />
                      )}
                      {isFuture && (
                        <rect
                          x={x + 0.5}
                          y={y + 0.5}
                          width={CELL - 1}
                          height={CELL - 1}
                          fill="none"
                          className="stroke-current stroke-[1]"
                          rx={0.5}
                        />
                      )}
                      {isCurrent && (
                        <>
                          <rect x={x} y={y} width={CELL} height={CELL} className="fill-current" rx={0.5} />
                          <rect
                            x={x - 2}
                            y={y - 2}
                            width={CELL + 4}
                            height={CELL + 4}
                            fill="none"
                            className="stroke-primary"
                            strokeWidth={2.25}
                            rx={1}
                          />
                        </>
                      )}
                    </g>
                  );
                })}

                <text
                  x={gridW / 2}
                  y={gridH - 8}
                  textAnchor="middle"
                  className="fill-current opacity-70 text-[10px] tracking-[0.22em]"
                  style={{ fontVariantCaps: "small-caps" }}
                >
                  {`6,240 weeks · ${APP_TAGLINE}`}
                </text>
              </svg>
            </div>
            </div>
            </div>
          </div>
        )}

        {dob && phaseStats && (
          <section className={cn("p-3 sm:p-4", cardClass)}>
            <LifeStatsBar stats={phaseStats} />
            <button
              type="button"
              onClick={() => setShowStageSettings((v) => !v)}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              {showStageSettings ? "Hide" : "Adjust"} college & retirement assumptions
            </button>
            {showStageSettings && (
              <LifeStageSettingsForm
                draft={stageDraft}
                onChange={setStageDraft}
                onSave={onSaveStageSettings}
                saving={saving}
              />
            )}
          </section>
        )}

        {dob && (
          <section className="shrink-0">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2 px-0.5">
              Daily review
            </h2>
            <LifePrioritiesPanel />
          </section>
        )}

        {dob && !showHubShell && (
          <section className={`mx-auto max-w-lg p-4 sm:p-5 ${POSTER_CLASS}`}>
            <Label htmlFor="life-dob-edit" className="text-xs uppercase tracking-wide text-muted-foreground">
              Update birth date
            </Label>
            <div className="mt-2 flex flex-col sm:flex-row gap-2 sm:items-end max-w-md">
              <Input
                id="life-dob-edit"
                type="date"
                value={draftDob}
                max={dobMax}
                onChange={(e) => setDraftDob(e.target.value)}
                className="bg-white/80 dark:bg-zinc-900/80"
              />
              <Button type="button" variant="secondary" onClick={onSaveDob} disabled={saving || draftDob === (dob ?? "")}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
              </Button>
            </div>
          </section>
        )}
      </div>
  );

  if (showHubShell) {
    return (
      <HubPageLayout
        title="My life in weeks"
        description="Your weeks at a glance — then check in on today"
        mainClassName="flex flex-col min-h-0 overflow-y-auto"
      >
        {pageBody}
      </HubPageLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe-16">
      <header className="sticky top-0 z-20 flex items-center gap-2 px-3 py-3 sm:px-4 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <Button variant="ghost" size="icon" asChild className="shrink-0 -ml-1" aria-label="Back">
          <Link to="/home">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h1 className="text-base font-semibold tracking-tight">My life in weeks</h1>
      </header>
      {pageBody}
    </div>
  );
}
