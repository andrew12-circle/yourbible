import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chartSlotLabel, type LifeChartSlot } from "@/lib/lifeChartRotation";
import { LIFE_WEEKS_CHART_SHORT, LIFE_WEEKS_CHART_TITLE } from "@/lib/lifeWeeks";
import type { LifeChartKind } from "@/hooks/useRotatingLifeChart";

type LifeChartRotationControlsProps = {
  activeSlot: LifeChartSlot;
  availableSlots: LifeChartSlot[];
  chartKind: LifeChartKind;
  displayName?: string | null;
  /** Poster-style birthdate shown beside the chart title (blink charts). */
  birthDateLabel?: string | null;
  onSelect: (slot: LifeChartSlot) => void;
  onPrev: () => void;
  onNext: () => void;
  className?: string;
};

const SLOT_ORDER: LifeChartSlot[] = ["self", "lilly", "caroline"];

function chartSubtitle(
  kind: LifeChartKind,
  person: string,
  birthDateLabel?: string | null,
): string {
  if (kind === "life-weeks") return LIFE_WEEKS_CHART_TITLE;
  const parts = [kind === "blink" ? "Blink of an Eye" : LIFE_WEEKS_CHART_SHORT, person];
  if (birthDateLabel?.trim()) parts.push(birthDateLabel.trim());
  return parts.join(" · ");
}

export function LifeChartRotationControls({
  activeSlot,
  availableSlots,
  chartKind,
  displayName,
  birthDateLabel,
  onSelect,
  onPrev,
  onNext,
  className,
}: LifeChartRotationControlsProps) {
  const person = chartSlotLabel(activeSlot, displayName);
  const subtitle = chartSubtitle(chartKind, person, birthDateLabel);

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Rotating view</p>
        <p
          className={cn(
            "text-sm font-medium leading-snug text-foreground",
            chartKind === "life-weeks" ? "text-[13px] sm:text-sm" : "truncate",
          )}
        >
          {subtitle}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onPrev} aria-label="Previous chart">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Life chart rotation">
          {SLOT_ORDER.map((slot) => {
            const ready = availableSlots.includes(slot);
            const active = slot === activeSlot;
            const label = chartSlotLabel(slot, displayName);
            return (
              <button
                key={slot}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`${label}${ready ? "" : " — add birthdate"}`}
                disabled={false}
                onClick={() => onSelect(slot)}
                className={cn(
                  "h-2.5 w-2.5 rounded-full border transition",
                  active ? "border-primary bg-primary scale-110" : "border-zinc-400 bg-transparent",
                  !ready && !active && "opacity-35",
                )}
                title={label}
              />
            );
          })}
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onNext} aria-label="Next chart">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
