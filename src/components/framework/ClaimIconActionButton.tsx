import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  IOS_CLAIM_ACTION_CHROME,
  IOS_CLAIM_ACTION_STYLES,
  type ClaimActionTone,
} from "@/lib/ui/iosClaimActionStyles";
import { cn } from "@/lib/utils";

export type { ClaimActionTone };

type Props = {
  label: string;
  icon: LucideIcon;
  tone: ClaimActionTone;
  /** Filled style when selected (verdict) or primary action emphasis. */
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  /** `labeled` shows icon + short text; `icon` is icon-only with tooltip. */
  variant?: "icon" | "labeled";
  /** Visible caption when `variant` is `labeled` (defaults to `label`). */
  shortLabel?: string;
};

/** Claim action — iOS tinted capsule (idle) or filled system color (active). */
export default function ClaimIconActionButton({
  label,
  icon: Icon,
  tone,
  active = false,
  onClick,
  disabled = false,
  className,
  variant = "icon",
  shortLabel,
}: Props) {
  const styles = IOS_CLAIM_ACTION_STYLES[tone];
  const caption = shortLabel ?? label;
  const labeled = variant === "labeled";

  const button = (
    <Button
      type="button"
      size={labeled ? "sm" : "icon"}
      variant="ghost"
      className={cn(
        IOS_CLAIM_ACTION_CHROME,
        labeled ? "h-9 w-auto gap-1.5 px-3.5" : "h-9 w-9 min-w-9 p-0",
        active ? styles.active : styles.idle,
        className,
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={labeled ? undefined : label}
      aria-pressed={active}
    >
      <Icon className={cn("shrink-0 stroke-[2.25]", labeled ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
      {labeled ? (
        <span className="text-[13px] font-semibold leading-none tracking-tight whitespace-nowrap">
          {caption}
        </span>
      ) : null}
    </Button>
  );

  if (labeled) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="top" className="font-system text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
