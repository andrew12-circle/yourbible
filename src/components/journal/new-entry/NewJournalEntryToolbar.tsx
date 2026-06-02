import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ToolbarTile({
  icon,
  label,
  onClick,
  disabled,
  accent,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-2 rounded-xl transition text-[11px] font-medium",
        disabled ? "text-muted-foreground/40" : "text-foreground hover:bg-muted active:bg-muted/80",
        accent && !disabled && "text-primary",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
