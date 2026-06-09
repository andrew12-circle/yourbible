import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Maximize2, Minus, Plus } from "lucide-react";
import {
  LIFE_WEEKS_TOTAL,
  type LifePhaseStats,
  type LifeWeekIndexResult,
  getCurrentWeekDisplay,
} from "@/lib/lifeWeeks";
import {
  AGE_TICKS,
  CELL,
  LABEL_SIZE,
  MARGIN_LEFT,
  MARGIN_TOP,
  POSTER_CLASS,
  WEEK_TICKS,
  colX,
  fitnessDashColor,
  rowY,
} from "@/lib/lifeWeeksGrid";
import { useLifeWeeksPanel, type LifeWeeksStageDraft } from "@/hooks/useLifeWeeksPanel";
import { LifePrioritiesPanel } from "@/components/home/LifePrioritiesPanel";
import { APP_NAME } from "@/lib/appBrand";

const APP_TAGLINE = APP_NAME;

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
    <div className="relative shrink-0 overflow-hidden rounded-2xl bg-[#1c1c1e] px-4 py-4 shadow-lg md:px-6 md:py-5">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.07] via-transparent to-transparent"
        aria-hidden
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">This week</p>
          <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-white md:text-5xl">
            Week {fmt(weekNumber)}
          </p>
          <p className="mt-1 text-sm tabular-nums text-white/55">
            Age {ageYear} · Week {weekOfYear} of 52 · {fmt(LIFE_WEEKS_TOTAL)} total
          </p>
        </div>
        <div className="shrink-0 sm:text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Time left</p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-white md:text-3xl">
            {fmt(stats.weeksRemaining)}
            <span className="ml-1.5 text-sm font-semibold text-white/55 md:text-base">weeks</span>
          </p>
          <p className="mt-1 text-xs tabular-nums text-white/55">
            {fmt(stats.weeksLived)} lived · {stats.pctOfLifespan.toFixed(1)}%
          </p>
        </div>
      </div>
      <div
        className="relative mt-4 flex w-full gap-[3px]"
        aria-label={`Year ${ageYear}: week ${weekOfYear} of 52`}
      >
        {Array.from({ length: 52 }, (_, c) => {
          const isPast = c < weekCol;
          const isCurrent = c === weekCol;
          const color = fitnessDashColor(c);
          return (
            <div
              key={c}
              className={cn(
                "h-2.5 min-w-0 flex-1 rounded-[3px]",
                isCurrent && "ring-2 ring-white ring-offset-1 ring-offset-[#1c1c1e]",
              )}
              style={
                isPast || isCurrent
                  ? {
                      backgroundColor: color,
                      boxShadow: isCurrent ? `0 0 10px ${color}99` : `0 0 4px ${color}55`,
                    }
                  : {
                      backgroundColor: "rgba(255,255,255,0.06)",
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.14)",
                    }
              }
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
    <div className="-mx-1 flex flex-wrap gap-2 px-1 pb-1" aria-label="Life week statistics">
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

function LifeStageSettingsForm({
  draft,
  onChange,
  onSave,
  saving,
}: {
  draft: LifeWeeksStageDraft;
  onChange: (next: LifeWeeksStageDraft) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-3 grid max-w-2xl gap-3 border-t border-zinc-300/60 pt-3 dark:border-zinc-600/60 sm:grid-cols-2">
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
      <p className="space-y-1 text-xs text-muted-foreground sm:col-span-2">
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

type LifeWeeksPanelProps = {
  /** When true, panel is embedded in Overview — compact grid, no daily review section. */
  embedded?: boolean;
};

export function LifeWeeksPanel({ embedded = false }: LifeWeeksPanelProps) {
  const panel = useLifeWeeksPanel();
  const {
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
    gridW,
    gridH,
  } = panel;

  const hubLayout = showHubShell && !embedded;
  const fitMaxHeight = embedded
    ? "min(42vh, 420px)"
    : showHubShell
      ? "min(58vh, calc(100dvh - 22rem))"
      : "calc(100dvh - 280px)";

  return (
    <div
      id="life-weeks"
      className={cn(
        "mx-auto w-full space-y-3 md:space-y-4",
        hubLayout ? "flex min-h-0 flex-1 flex-col" : embedded ? "" : "max-w-5xl px-3 pt-4 sm:px-4",
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
          <p className="mb-3 text-sm leading-relaxed">
            Add your birthdate to see a 120-year week grid (6,240 weeks). It stays on your profile.
          </p>
          <div className="max-w-xs space-y-2">
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

      {dob && phaseStats && indexState && <CurrentWeekHero stats={phaseStats} indexState={indexState} />}

      {dob && !indexState && (
        <section className={`mx-auto max-w-lg p-4 sm:p-5 ${POSTER_CLASS}`}>
          <p className="text-sm text-muted-foreground">
            Could not compute weeks from this date. Try correcting it below.
          </p>
        </section>
      )}

      {dob && indexState && (
        <div className={cn("space-y-2", hubLayout && "flex min-h-[280px] flex-1 flex-col")}>
          <div className="flex shrink-0 items-center justify-end gap-1.5 px-1">
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
            <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
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
              hubLayout ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "overflow-hidden",
            )}
          >
            <div
              ref={gridScrollRef}
              className={cn(
                boundedGridView
                  ? hubLayout
                    ? "flex min-h-0 flex-1 items-center justify-center"
                    : "mx-auto"
                  : cn(
                      "overflow-auto overscroll-contain scrollbar-hide",
                      hubLayout
                        ? "flex min-h-0 w-full flex-1"
                        : "inline-block max-h-[min(58vh,calc(100dvh-18rem))]",
                    ),
              )}
            >
              <div
                className={boundedGridView ? (hubLayout ? "h-full w-full max-h-full max-w-full" : "mx-auto") : undefined}
                style={
                  boundedGridView
                    ? {
                        aspectRatio: `${viewBoxSize.w} / ${viewBoxSize.h}`,
                        maxWidth: "100%",
                        maxHeight: hubLayout ? "100%" : fitMaxHeight,
                      }
                    : undefined
                }
              >
                <svg
                  role="img"
                  aria-label="My life in weeks: 120 rows by 52 columns"
                  viewBox={svgViewBox}
                  preserveAspectRatio="xMidYMid meet"
                  width={boundedGridView ? "100%" : gridW * (typeof zoom === "number" ? zoom : 1)}
                  height={boundedGridView ? "100%" : gridH * (typeof zoom === "number" ? zoom : 1)}
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
                        className="pointer-events-none fill-current"
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
                          className="pointer-events-none fill-current"
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
                        className="pointer-events-none fill-current"
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
                    className="fill-current text-[10px] tracking-[0.22em] opacity-70"
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
        <section className={cn("shrink-0 p-3 sm:p-4", cardClass)}>
          <LifeStatsBar stats={phaseStats} />
          <button
            type="button"
            onClick={() => setShowStageSettings((v) => !v)}
            className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
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

      {dob && !embedded && (
        <section className="shrink-0">
          <h2 className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
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
          <div className="mt-2 flex max-w-md flex-col gap-2 sm:flex-row sm:items-end">
            <Input
              id="life-dob-edit"
              type="date"
              value={draftDob}
              max={dobMax}
              onChange={(e) => setDraftDob(e.target.value)}
              className="bg-white/80 dark:bg-zinc-900/80"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveDob}
              disabled={saving || draftDob === (dob ?? "")}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
