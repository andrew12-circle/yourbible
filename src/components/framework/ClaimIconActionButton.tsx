import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type ClaimActionTone =
  | "research"
  | "reflect"
  | "researchLater"
  | "keep"
  | "reject"
  | "update"
  | "defer";

const TONE_STYLES: Record<ClaimActionTone, { idle: string; active: string }> = {
  research: {
    idle:
      "border-sky-300/80 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 dark:border-sky-700/60 dark:bg-sky-950/70 dark:text-sky-300 dark:hover:bg-sky-900/80",
    active:
      "border-sky-600 bg-sky-600 text-white hover:bg-sky-700 hover:text-white dark:border-sky-500 dark:bg-sky-500 dark:hover:bg-sky-600",
  },
  reflect: {
    idle:
      "border-violet-300/80 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:border-violet-700/60 dark:bg-violet-950/70 dark:text-violet-300 dark:hover:bg-violet-900/80",
    active:
      "border-violet-600 bg-violet-600 text-white hover:bg-violet-700 dark:border-violet-500 dark:bg-violet-500 dark:hover:bg-violet-600",
  },
  researchLater: {
    idle:
      "border-amber-300/80 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/70 dark:text-amber-300 dark:hover:bg-amber-900/80",
    active:
      "border-amber-600 bg-amber-600 text-white hover:bg-amber-700 dark:border-amber-500 dark:bg-amber-500 dark:hover:bg-amber-600",
  },
  keep: {
    idle:
      "border-emerald-300/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/70 dark:text-emerald-300 dark:hover:bg-emerald-900/80",
    active:
      "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 dark:border-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-600",
  },
  reject: {
    idle:
      "border-rose-300/80 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 dark:border-rose-700/60 dark:bg-rose-950/70 dark:text-rose-300 dark:hover:bg-rose-900/80",
    active:
      "border-rose-600 bg-rose-600 text-white hover:bg-rose-700 dark:border-rose-500 dark:bg-rose-500 dark:hover:bg-rose-600",
  },
  update: {
    idle:
      "border-indigo-300/80 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-700/60 dark:bg-indigo-950/70 dark:text-indigo-300 dark:hover:bg-indigo-900/80",
    active:
      "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 dark:border-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600",
  },
  defer: {
    idle:
      "border-slate-300/80 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-800 dark:border-slate-600/60 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800/80",
    active:
      "border-slate-600 bg-slate-600 text-white hover:bg-slate-700 dark:border-slate-500 dark:bg-slate-500 dark:hover:bg-slate-600",
  },
};

type Props = {
  label: string;
  icon: LucideIcon;
  tone: ClaimActionTone;
  /** Filled style when selected (verdict) or primary action emphasis. */
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

/** Icon-only claim action with hover tooltip and semantic color. */
export default function ClaimIconActionButton({
  label,
  icon: Icon,
  tone,
  active = false,
  onClick,
  disabled = false,
  className,
}: Props) {
  const styles = TONE_STYLES[tone];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn(
            "h-8 w-8 shrink-0 rounded-full shadow-sm transition-colors",
            active ? styles.active : styles.idle,
            className,
          )}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={active}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
