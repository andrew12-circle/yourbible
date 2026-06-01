import type { InkTool } from "@/lib/ink/types";
import { cn } from "@/lib/utils";
import { SketchToolIcon } from "./tool-icons";

const GLYPH_CLASS = "h-[46px] w-[30px] shrink-0";

/** Optional per-tool vertical tweak so tips align on one baseline. */
const BASELINE_NUDGE: Partial<Record<InkTool, number>> = {
  fountain: 1,
  lasso: 2,
};


type Props = {
  tool: InkTool;
  active?: boolean;
  accentColor?: string;
  variant?: "toolbar" | "chip";
  isNightMode?: boolean;
};

/** 34×54 soft glass tile with centered 30×46 glyph — no crop. */
export function InkToolSilhouette({
  tool,
  active = false,
  accentColor,
  variant = "toolbar",
  isNightMode = false,
}: Props) {
  if (variant === "chip") {
    return (
      <SketchToolIcon
        tool={tool}
        active={active}
        accentColor={accentColor}
        className="h-8 w-[26px] shrink-0"
      />
    );
  }

  const nudge = BASELINE_NUDGE[tool] ?? 0;

  return (
    <span
      className="grid place-items-center"
      style={nudge ? { marginTop: nudge } : undefined}
    >
      <SketchToolIcon
        tool={tool}
        active={active}
        accentColor={accentColor}
        className={GLYPH_CLASS}
      />
    </span>
  );
}

export function InkToolSilhouetteSlot({
  tool,
  active,
  accentColor,
  variant = "toolbar",
  label,
  onClick,
  isNightMode = false,
}: {
  tool: InkTool;
  active: boolean;
  accentColor?: string;
  variant?: "toolbar" | "chip";
  label: string;
  onClick: () => void;
  isNightMode?: boolean;
}) {
  const isChip = variant === "chip";
  const showAppleDot =
    active && !isChip && tool !== "eraser" && tool !== "ruler" && tool !== "lasso";

  if (isChip) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={label}
        aria-label={label}
        aria-pressed={active}
        className="relative flex h-10 w-10 items-center justify-center border-none bg-transparent p-0"
        style={{ touchAction: "manipulation" }}
      >
        <InkToolSilhouette
          tool={tool}
          active={active}
          accentColor={accentColor}
          variant="chip"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "tool-tile relative grid shrink-0 place-items-center border-none transition-[transform,background] duration-200 ease-out",
        "h-[54px] w-[34px] rounded-[10px]",
        isNightMode
          ? "bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_4px_10px_rgba(0,0,0,0.22)]"
          : "bg-[rgba(255,255,255,0.58)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_4px_10px_rgba(0,0,0,0.08)]",
        active &&
          (isNightMode
            ? "bg-white/[0.22] -translate-y-[3px]"
            : "bg-[rgba(255,255,255,0.82)] -translate-y-[3px]"),
        !active && !isNightMode && "hover:bg-[rgba(255,255,255,0.68)]",
        showAppleDot &&
          "after:absolute after:bottom-[3px] after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-[#007aff] after:content-['']",
      )}
      style={{ touchAction: "manipulation" }}
    >
      <InkToolSilhouette
        tool={tool}
        active={active}
        accentColor={accentColor}
        isNightMode={isNightMode}
      />
    </button>
  );
}
