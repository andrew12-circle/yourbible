import { INK_PEN_COLORS, INK_PEN_SIZES } from "@/lib/ink/strokeRender";
import type { InkTool } from "@/lib/ink/types";
import { cn } from "@/lib/utils";

type Props = {
  tool: InkTool;
  color: string;
  size: number;
  canUndo: boolean;
  canRedo: boolean;
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
  onTool,
  onColor,
  onSize,
  onUndo,
  onRedo,
  onClear,
}: Props) {
  return (
    <div
      className="pointer-events-auto fixed bottom-safe-20 left-1/2 z-[35] flex max-w-[min(100vw-1rem,28rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-full border border-paper-edge/80 bg-paper/95 px-2 py-1.5 shadow-lg backdrop-blur-sm"
      role="toolbar"
      aria-label="Ink tools"
      data-reader-ink-toolbar
    >
      <ToolbarBtn active={tool === "fountain"} onClick={() => onTool("fountain")} label="Pen">
        Pen
      </ToolbarBtn>
      <ToolbarBtn active={tool === "eraser"} onClick={() => onTool("eraser")} label="Eraser">
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
            "h-6 w-6 rounded-full border-2 transition-transform",
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
      <ToolbarBtn active={false} disabled={!canUndo} onClick={onUndo} label="Undo">
        Undo
      </ToolbarBtn>
      <ToolbarBtn active={false} disabled={!canRedo} onClick={onRedo} label="Redo">
        Redo
      </ToolbarBtn>
      <ToolbarBtn active={false} disabled={!canUndo} onClick={onClear} label="Clear page ink">
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
}: {
  children: React.ReactNode;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full px-2 py-1 text-[11px] font-medium transition-colors",
        active ? "bg-leather text-paper" : "text-leather/80 hover:bg-paper-warm",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {children}
    </button>
  );
}
