import { cn } from "@/lib/utils";
import type { ResponseDepthSetting } from "@/lib/journal/responseDepth";

const OPTIONS: { value: ResponseDepthSetting; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "reflect", label: "Reflect" },
  { value: "deep", label: "Go deep" },
];

type Props = {
  value: ResponseDepthSetting;
  onChange: (value: ResponseDepthSetting) => void;
  idPrefix?: string;
  className?: string;
};

export default function ResponseDepthControl({ value, onChange, idPrefix = "depth", className }: Props) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-sm font-medium">Response depth</div>
      <div
        className="inline-flex w-full rounded-lg border border-border/70 bg-muted/30 p-0.5"
        role="group"
        aria-label="Response depth"
      >
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              id={`${idPrefix}-${opt.value}`}
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Auto switches to Go deep for faith and struggle questions. Reflect stays gentle and question-led.
      </p>
    </div>
  );
}
