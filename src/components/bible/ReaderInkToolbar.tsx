import { INK_PEN_COLORS, INK_PEN_SIZES } from "@/lib/ink/strokeRender";
import type { InkTool } from "@/lib/ink/types";
import { cn } from "@/lib/utils";

type Props = {
  tool: InkTool;
  color: string;
  size: number;
  canUndo: boolean;
  canRedo: boolean;
  /** iPad portrait — mobile placement with wider controls. */
  tabletPortrait?: boolean;
  onTool: (t: InkTool) => void;
  onColor: (c: string) => void;
  onSize: (n: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
};

export function ReaderInkToolbar({
  tool,
  color,
  size,
  canUndo,
  canRedo,
  tabletPortrait = false,
  onTool,
  onColor,
  onSize,
  onUndo,
  onRedo,
  onClear,
}: Props) {
  return (
    <div
      className={cn(
        "pointer-events-auto fixed bottom-safe-20 left-1/2 z-[35] flex -translate-x-1/2 items-center justify-center rounded-full border border-paper-edge/80 bg-paper/95 shadow-lg backdrop-blur-sm",
        tabletPortrait
          ? "max-w-[min(100vw-2rem,40rem)] flex-nowrap gap-1.5 px-3 py-2"
          : "max-w-[min(100vw-1rem,28rem)] flex-wrap gap-1 px-2 py-1.5",
      )}
      role="toolbar"
      aria-label="Ink tools"
      data-reader-ink-toolbar
    >
      <ToolbarBtn active={tool === "fountain"} onClick={() => onTool("fountain")} label="Pen" large={tabletPortrait}>
        Pen
      </ToolbarBtn>
      <ToolbarBtn active={tool === "eraser"} onClick={() => onTool("eraser")} label="Eraser" large={tabletPortrait}>
        Eraser
      </ToolbarBtn>
      <span className="mx-0.5 h-5 w-px bg-paper-edge" aria-hidden />
      {INK_PEN_COLORS.slice(0, 5).map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.name}
          aria-label={c.name}
          className={cn(
            "rounded-full border-2 transition-transform",
            tabletPortrait ? "h-7 w-7" : "h-6 w-6",
            color === c.value ? "border-leather scale-110" : "border-transparent",
          )}
          style={{ background: c.value }}
          onClick={() => onColor(c.value)}
        />
      ))}
      <span className="mx-0.5 h-5 w-px bg-paper-edge" aria-hidden />
      {INK_PEN_SIZES.slice(0, 3).map((s) => (
        <button
          key={s}
          type="button"
          aria-label={`Size ${s}`}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-medium",
            size === s ? "bg-leather text-paper" : "text-leather/70 hover:bg-paper-warm",
          )}
          onClick={() => onSize(s)}
        >
          {s}
        </button>
      ))}
      <span className="mx-0.5 h-5 w-px bg-paper-edge" aria-hidden />
      <ToolbarBtn active={false} disabled={!canUndo} onClick={onUndo} label="Undo" large={tabletPortrait}>
        Undo
      </ToolbarBtn>
      <ToolbarBtn active={false} disabled={!canRedo} onClick={onRedo} label="Redo" large={tabletPortrait}>
        Redo
      </ToolbarBtn>
      <ToolbarBtn active={false} disabled={!canUndo} onClick={onClear} label="Clear page ink" large={tabletPortrait}>
        Clear
      </ToolbarBtn>
    </div>
  );
}

function ToolbarBtn({
  children,
  active,
  disabled,
  onClick,
  label,
  large = false,
}: {
  children: React.ReactNode;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full px-2 py-1 font-medium transition-colors",
        large ? "text-xs" : "text-[11px]",
        active ? "bg-leather text-paper" : "text-leather/80 hover:bg-paper-warm",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </button>
  );
}
