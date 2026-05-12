import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, Loader2 } from "lucide-react";
import {
  LIFE_WEEKS_TOTAL,
  computeLifeWeekIndex,
  formatBirthDateForInput,
  parseUtcDateOnly,
} from "@/lib/lifeWeeks";
import { toast } from "@/hooks/use-toast";

const APP_TAGLINE = "Your Bible";

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

const WEEK_TICKS = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 52] as const;
const AGE_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120] as const;

function todayIsoMax(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function LifeWeeksPage() {
  const { user, profile, loading, updateProfile } = useAuth();
  const [now, setNow] = useState(() => Date.now());
  const [draftDob, setDraftDob] = useState("");
  const [saving, setSaving] = useState(false);
  const [missingDobColumn, setMissingDobColumn] = useState(false);
  const dobMax = todayIsoMax();

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

  const weeksLived = indexState === null ? 0 : indexState.currentWeekIndex + 1;
  const weeksRemaining = indexState === null ? LIFE_WEEKS_TOTAL : Math.max(0, LIFE_WEEKS_TOTAL - weeksLived);
  const pctLife =
    LIFE_WEEKS_TOTAL > 0 && indexState
      ? (100 * weeksLived) / LIFE_WEEKS_TOTAL
      : 0;

  const gridW = MARGIN_LEFT + colX(51) + CELL + 12;
  const gridH = MARGIN_TOP + rowY(119) + CELL + 28;

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-mesh">
        <Loader2 className="w-6 h-6 animate-spin opacity-50" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen app-mesh pb-16">
      <header className="sticky top-0 z-20 flex items-center gap-2 px-3 py-3 sm:px-4 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <Button variant="ghost" size="icon" asChild className="shrink-0 -ml-1" aria-label="Back">
          <Link to="/home">
            <ChevronLeft className="w-5 h-5" />
          </Link>
        </Button>
        <h1 className="text-base font-semibold tracking-tight">My life in weeks</h1>
      </header>

      <div className="max-w-lg mx-auto px-3 sm:px-4 pt-4 space-y-4">
        {missingDobColumn && (
          <div
            role="alert"
            className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100"
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
          <section className={`p-4 sm:p-5 ${POSTER_CLASS}`}>
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

        {dob && indexState && (
          <section className={`p-4 sm:p-5 ${POSTER_CLASS}`}>
            <p className="text-sm tabular-nums leading-snug">
              <span className="font-semibold">{weeksLived.toLocaleString()} weeks</span> lived ·{" "}
              <span className="font-semibold">{weeksRemaining.toLocaleString()} weeks</span> remaining ·{" "}
              <span className="text-muted-foreground dark:text-zinc-400">{pctLife.toFixed(1)}% of 120 years</span>
            </p>
          </section>
        )}

        {dob && !indexState && (
          <section className={`p-4 sm:p-5 ${POSTER_CLASS}`}>
            <p className="text-sm text-muted-foreground">Could not compute weeks from this date. Try correcting it below.</p>
          </section>
        )}

        {dob && indexState && (
          <div className="overflow-x-auto -mx-1 px-1 pb-2">
            <div className={`inline-block min-w-0 p-3 sm:p-5 ${POSTER_CLASS}`}>
              <svg
                role="img"
                aria-label="My life in weeks: 120 rows by 52 columns"
                viewBox={`0 0 ${gridW} ${gridH}`}
                className="h-auto w-full min-w-[min(100%,320px)] max-w-full text-zinc-900 dark:text-zinc-100"
                style={{ maxHeight: "min(85vh, 1200px)" }}
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
        )}

        {dob && (
          <section className={`p-4 sm:p-5 ${POSTER_CLASS}`}>
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
    </div>
  );
}
