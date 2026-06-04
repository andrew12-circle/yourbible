import type { LucideIcon } from "lucide-react";
import type { ClaimActionTone } from "@/lib/ui/iosClaimActionStyles";
import { artifactClaimActionChip } from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";

const CHIP_TONE: Record<
  ClaimActionTone,
  { icon: string; idle: string; active: string }
> = {
  research: {
    icon: "text-[#007AFF] dark:text-[#0A84FF]",
    idle: "border-border/45 hover:border-blue-200/80",
    active: "border-blue-200/90 bg-blue-50/90 ring-blue-100/80 dark:bg-blue-950/40 dark:border-blue-500/40",
  },
  reflect: {
    icon: "text-[#AF52DE] dark:text-[#BF5AF2]",
    idle: "border-border/45 hover:border-violet-200/80",
    active: "border-violet-200/90 bg-violet-50/90 ring-violet-100/80 dark:bg-violet-950/40 dark:border-violet-500/40",
  },
  researchLater: {
    icon: "text-[#FF9500] dark:text-[#FF9F0A]",
    idle: "border-border/45 hover:border-amber-200/80",
    active: "border-amber-200/90 bg-amber-50/90 ring-amber-100/80 dark:bg-amber-950/40 dark:border-amber-500/40",
  },
  keep: {
    icon: "text-[#34C759] dark:text-[#30D158]",
    idle: "border-border/45 hover:border-emerald-200/80",
    active: "border-emerald-200/90 bg-emerald-50/90 ring-emerald-100/80 dark:bg-emerald-950/40 dark:border-emerald-500/40",
  },
  reject: {
    icon: "text-[#FF3B30] dark:text-[#FF453A]",
    idle: "border-border/45 hover:border-rose-200/80",
    active: "border-rose-200/90 bg-rose-50/90 ring-rose-100/80 dark:bg-rose-950/40 dark:border-rose-500/40",
  },
  update: {
    icon: "text-[#5856D6] dark:text-[#5E5CE6]",
    idle: "border-border/45 hover:border-indigo-200/80",
    active: "border-indigo-200/90 bg-indigo-50/90 ring-indigo-100/80 dark:bg-indigo-950/40 dark:border-indigo-500/40",
  },
  defer: {
    icon: "text-muted-foreground",
    idle: "border-border/45 hover:border-border/70",
    active: "border-border/80 bg-muted/60 ring-border/60",
  },
};

type Props = {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  tone: ClaimActionTone;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

/** Claim action pill — matches doctrine tag chips on the claim card. */
export default function ClaimChipActionButton({
  label,
  shortLabel,
  icon: Icon,
  tone,
  active = false,
  onClick,
  disabled = false,
  className,
}: Props) {
  const styles = CHIP_TONE[tone];

  return (
    <button
      type="button"
      className={cn(artifactClaimActionChip, active ? styles.active : styles.idle, className)}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon className={cn("h-4 w-4 shrink-0 stroke-[2.25]", styles.icon)} aria-hidden />
      <span className="whitespace-nowrap leading-none">{shortLabel}</span>
    </button>
  );
}
