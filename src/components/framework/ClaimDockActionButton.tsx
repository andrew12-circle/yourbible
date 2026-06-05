import type { LucideIcon } from "lucide-react";
import type { ClaimActionTone } from "@/lib/ui/iosClaimActionStyles";
import { cn } from "@/lib/utils";

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

/** Claim action tab — matches FloatingTabItemButton (app dock) layout; fixed width for horizontal scroll. */
export default function ClaimDockActionButton({
  label,
  shortLabel,
  icon: Icon,
  tone: _tone,
  active = false,
  onClick,
  disabled = false,
  className,
}: Props) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-w-[4.25rem] shrink-0 flex-col items-center gap-0.5 rounded-full px-2 py-1.5",
        "text-[10px] font-medium leading-none transition-colors",
        active
          ? "bg-muted text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={1.85} aria-hidden />
      <span className="max-w-[4.5rem] truncate whitespace-nowrap">{shortLabel}</span>
    </button>
  );
}
