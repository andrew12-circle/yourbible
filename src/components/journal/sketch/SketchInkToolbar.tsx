import { forwardRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import {
  ChevronUp,
  Grid2X2,
  GripHorizontal,
  MoreHorizontal,
  Plus,
  Redo2,
  RotateCcw,
  Square,
  Undo2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { InkDrawTool, InkTool } from "@/lib/ink/types";
import { INK_TOOL_PRESETS } from "@/lib/ink/toolPresets";
import { cn } from "@/lib/utils";
import { InkToolSilhouette, InkToolSilhouetteSlot } from "./InkToolSilhouette";

export type SketchPaper = "blank" | "ruled" | "legal" | "graph" | "dot";

type PenColor = { name: string; value: string };

/** Tool strip order — matches Apple Pencil / Handwritten reference. */
export const SKETCH_TOOL_ITEMS: { id: InkTool; label: string }[] = [
  { id: "fineline", label: "Fine tip" },
  { id: "fountain", label: "Pen" },
  { id: "marker", label: "Marker" },
  { id: "pencil", label: "Pencil" },
  { id: "highlighter", label: "Highlighter" },
  { id: "eraser", label: "Eraser" },
  { id: "ruler", label: "Ruler" },
  { id: "lasso", label: "Lasso" },
];

const READER_TOOL_ITEMS = SKETCH_TOOL_ITEMS.filter(
  (t) => t.id !== "ruler" && t.id !== "lasso",
);

const APPLE_PALETTE = [
  { name: "White", value: "#ffffff" },
  { name: "Blue", value: "#007aff" },
  { name: "Green", value: "#34c759" },
  { name: "Yellow", value: "#ffcc00" },
  { name: "Red", value: "#ff3b30" },
] as const;

function normalizeHex(c: string) {
  return c.trim().toLowerCase();
}

function colorMatchesPalette(current: string, swatch: string) {
  return normalizeHex(current) === normalizeHex(swatch);
}

type Props = {
  /** `reader` — Bible page ink (no ruler/lasso/paper). */
  variant?: "sketch" | "reader";
  isNightMode: boolean;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  tool: InkTool;
  color: string;
  size: number;
  penColors: PenColor[];
  paper: SketchPaper;
  hasStrokes: boolean;
  redoCount: number;
  drawWithFinger: boolean;
  rulerVisible: boolean;
  snapToRuler: boolean;
  tabletPortrait?: boolean;
  onToolChange: (tool: InkTool) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onPaperChange: (paper: SketchPaper) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDrawWithFingerChange: (v: boolean) => void;
  onSnapToRulerChange: (v: boolean) => void;
  customColorInputRef?: React.RefObject<HTMLInputElement | null>;
};

const COLOR_SWATCH_SHADOW =
  "shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.12),0_4px_10px_rgba(0,0,0,0.08)]";

function ToolbarDivider({ isNightMode }: { isNightMode: boolean }) {
  return (
    <div
      className={cn(
        "mx-1 h-11 w-px shrink-0 self-center",
        isNightMode
          ? "bg-gradient-to-b from-transparent via-white/20 to-transparent"
          : "bg-gradient-to-b from-transparent via-black/12 to-transparent",
      )}
      aria-hidden
    />
  );
}

/** Inset tray groups a toolbar zone (tools, colors, actions). */
function ToolbarTray({
  isNightMode,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  isNightMode: boolean;
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center rounded-2xl p-0.5",
        isNightMode
          ? "bg-black/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-1px_0_rgba(0,0,0,0.35)]"
          : "bg-black/[0.045] shadow-[inset_0_1px_2px_rgba(0,0,0,0.07),inset_0_-1px_0_rgba(255,255,255,0.65)]",
        className,
      )}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

const SKETCH_MENU_CONTENT_CLASS = "z-[100]";

type PillCircleButtonProps = ComponentPropsWithoutRef<"button"> & {
  isNightMode: boolean;
  label: string;
  children: ReactNode;
};

const PillCircleButton = forwardRef<HTMLButtonElement, PillCircleButtonProps>(
  function PillCircleButton(
    { isNightMode, label, children, className, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full border-none transition",
          isNightMode
            ? "bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_6px_16px_rgba(0,0,0,0.28)] hover:bg-white/[0.18] disabled:opacity-30"
            : "bg-[rgba(245,245,247,0.85)] text-neutral-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_16px_rgba(0,0,0,0.08)] hover:bg-[rgba(245,245,247,0.95)] disabled:opacity-30",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

export default function SketchInkToolbar({
  variant = "sketch",
  isNightMode,
  collapsed,
  onCollapsedChange,
  tool,
  color,
  size,
  penColors,
  paper,
  hasStrokes,
  redoCount,
  drawWithFinger,
  rulerVisible,
  snapToRuler,
  tabletPortrait = false,
  onToolChange,
  onColorChange,
  onSizeChange,
  onPaperChange,
  onUndo,
  onRedo,
  onClear,
  onDrawWithFingerChange,
  onSnapToRulerChange,
  customColorInputRef,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isReader = variant === "reader";
  const toolItems = isReader ? READER_TOOL_ITEMS : SKETCH_TOOL_ITEMS;
  const isDrawTool = tool !== "ruler" && tool !== "lasso";
  const canPickColor = tool !== "eraser";
  const customColorActive =
    isDrawTool && !APPLE_PALETTE.some((c) => colorMatchesPalette(color, c.value));

  const selectTool = (next: InkTool) => {
    onToolChange(next);
    if (next !== "eraser" && next !== "ruler" && next !== "lasso") {
      const preset = INK_TOOL_PRESETS[next as InkDrawTool];
      onSizeChange(preset.defaultSize);
      if (preset.defaultColor) onColorChange(preset.defaultColor);
    }
  };

  const pillChrome = cn(
    "sticky top-1 z-50 mx-auto flex h-[78px] w-fit max-w-[calc(100%-1rem)] shrink-0 items-center gap-0 rounded-full px-2",
    "border backdrop-blur-[36px] backdrop-saturate-[180%]",
    isNightMode
      ? "border-white/[0.14] bg-[rgba(18,18,22,0.82)] shadow-[0_22px_56px_rgba(0,0,0,0.45),0_4px_12px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-1px_0_rgba(0,0,0,0.4)]"
      : "border-[rgba(255,255,255,0.9)] bg-[rgba(255,255,255,0.82)] shadow-[0_20px_48px_rgba(0,0,0,0.16),0_4px_10px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-1px_0_rgba(0,0,0,0.04)]",
    tabletPortrait && "px-2.5",
  );

  const ringOffset = isNightMode ? "ring-offset-[rgba(18,18,22,0.76)]" : "ring-offset-[rgba(255,255,255,0.78)]";

  if (collapsed) {
    return (
      <div className="pointer-events-none sticky top-1 z-50 flex justify-center px-3">
        <button
          type="button"
          onClick={() => onCollapsedChange(false)}
          aria-label={isReader ? "Show ink tools" : "Show markup tools"}
          aria-expanded={false}
          className={cn(
            "pointer-events-auto relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-[3px] shadow-lg transition active:scale-95",
            isNightMode
              ? "border-white/25 bg-[rgba(18,18,22,0.78)] backdrop-blur-[32px] hover:bg-[rgba(28,28,32,0.88)]"
              : "border-black/[0.08] bg-[rgba(255,255,255,0.72)] backdrop-blur-[32px] hover:bg-[rgba(255,255,255,0.82)]",
          )}
          style={{ borderColor: isDrawTool ? color : undefined }}
        >
          <span
            className="absolute inset-1 rounded-full opacity-20"
            style={{ background: isDrawTool ? color : "#94a3b8" }}
            aria-hidden
          />
          <InkToolSilhouette
            tool={tool}
            active
            accentColor={isDrawTool ? color : undefined}
            variant="chip"
          />
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none sticky top-1 z-50 flex justify-center px-3">
      <div
        role="toolbar"
        aria-label={isReader ? "Bible page ink tools" : "Handwritten markup tools"}
        className={cn(pillChrome, "pointer-events-auto overflow-visible")}
        data-reader-ink-toolbar={isReader ? "" : undefined}
        style={{ touchAction: "manipulation" }}
      >
        <ToolbarTray isNightMode={isNightMode} aria-label="Undo and redo" className="gap-0.5 px-1">
          <PillCircleButton isNightMode={isNightMode} label="Undo" disabled={!hasStrokes} onClick={onUndo}>
            <Undo2 className="h-4 w-4" strokeWidth={2} />
          </PillCircleButton>
          <PillCircleButton
            isNightMode={isNightMode}
            label="Redo"
            disabled={redoCount === 0}
            onClick={onRedo}
          >
            <Redo2 className="h-4 w-4" strokeWidth={2} />
          </PillCircleButton>
        </ToolbarTray>

        <ToolbarDivider isNightMode={isNightMode} />

        <div
          role="group"
          aria-label="Drawing tools"
          className={cn(
            "tool-group mr-3 flex min-w-0 max-w-[min(52vw,320px)] shrink-0 items-center gap-1.5 overflow-x-auto rounded-[18px] p-1.5 scrollbar-hide sm:max-w-none",
            isNightMode ? "bg-white/[0.08]" : "bg-[rgba(255,255,255,0.32)]",
          )}
        >
          {toolItems.map(({ id, label }) => {
            const active = tool === id || (id === "ruler" && rulerVisible);
            return (
              <InkToolSilhouetteSlot
                key={id}
                tool={id}
                active={active}
                isNightMode={isNightMode}
                accentColor={
                  active && id !== "eraser" && id !== "ruler" && id !== "lasso" ? color : undefined
                }
                label={label}
                onClick={() => selectTool(id)}
              />
            );
          })}
        </div>

        <ToolbarDivider isNightMode={isNightMode} />

        <ToolbarTray isNightMode={isNightMode} aria-label="Colors">
          <div className="grid grid-cols-3 gap-1 p-0.5" role="group">
            {APPLE_PALETTE.map((c) => {
              const selected = colorMatchesPalette(color, c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  aria-label={`Color ${c.name}`}
                  aria-pressed={selected}
                  disabled={!canPickColor}
                  onClick={() => onColorChange(c.value)}
                  className={cn(
                    "h-5 w-5 rounded-full border border-white/90 transition hover:scale-105 disabled:opacity-40",
                    COLOR_SWATCH_SHADOW,
                    selected && cn("ring-[1.5px] ring-white/95 ring-offset-1", ringOffset),
                  )}
                  style={{ background: c.value }}
                />
              );
            })}
            <button
              type="button"
              title="Custom color"
              aria-label="Custom color"
              aria-pressed={customColorActive}
              disabled={!canPickColor}
              onClick={() => customColorInputRef?.current?.click()}
              className={cn(
                "h-5 w-5 rounded-full border border-white/90 disabled:opacity-40",
                COLOR_SWATCH_SHADOW,
                customColorActive && cn("ring-[1.5px] ring-white/95 ring-offset-1", ringOffset),
              )}
              style={{
                background:
                  "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
              }}
            />
          </div>
        </ToolbarTray>

        <ToolbarDivider isNightMode={isNightMode} />

        <ToolbarTray isNightMode={isNightMode} aria-label="Markup actions" className="gap-0.5 px-1">
          <PillCircleButton
            isNightMode={isNightMode}
            label={`Stroke size ${size}`}
            disabled={!isDrawTool}
            onClick={() => {
              const sizes = [2, 4, 6, 10, 16, 20];
              const idx = sizes.indexOf(size);
              onSizeChange(sizes[(idx + 1) % sizes.length] ?? 4);
            }}
          >
            <span
              className="block rounded-full"
              style={{
                width: Math.min(size + 4, 14),
                height: Math.min(size + 4, 14),
                background: isDrawTool ? color : isNightMode ? "#94a3b8" : "#64748b",
              }}
            />
          </PillCircleButton>

          <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen} modal={false}>
            <DropdownMenuTrigger asChild>
              <PillCircleButton isNightMode={isNightMode} label="More tools">
                <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
              </PillCircleButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={cn("w-56", SKETCH_MENU_CONTENT_CLASS)}>
              {!isReader ? (
                <>
                  <DropdownMenuLabel>Markup</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem
                    checked={drawWithFinger}
                    onCheckedChange={(v) => onDrawWithFingerChange(v === true)}
                  >
                    Draw with finger
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={snapToRuler}
                    onCheckedChange={(v) => onSnapToRulerChange(v === true)}
                  >
                    Snap strokes to ruler
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Paper</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={paper} onValueChange={(v) => onPaperChange(v as SketchPaper)}>
                    <DropdownMenuRadioItem value="ruled">
                      <GripHorizontal className="mr-2 h-3.5 w-3.5" /> Notebook
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="legal">Yellow pad</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="blank">
                      <Square className="mr-2 h-3.5 w-3.5" /> Blank
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="graph">
                      <Grid2X2 className="mr-2 h-3.5 w-3.5" /> Graph
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dot">Dot grid</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem onClick={onClear} disabled={!hasStrokes} className="text-destructive">
                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Clear page
              </DropdownMenuItem>
              {!isReader && penColors.length > 6 ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>All colors</DropdownMenuLabel>
                  <div className="flex flex-wrap gap-1.5 p-2">
                    {penColors.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        title={c.name}
                        className="h-6 w-6 rounded-full border"
                        style={{ background: c.value }}
                        onClick={() => onColorChange(c.value)}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>

          {!isReader ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <PillCircleButton isNightMode={isNightMode} label="Paper type">
                  <Plus className="h-5 w-5" strokeWidth={2} />
                </PillCircleButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={SKETCH_MENU_CONTENT_CLASS}>
                <DropdownMenuLabel>Paper</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={paper} onValueChange={(v) => onPaperChange(v as SketchPaper)}>
                  <DropdownMenuRadioItem value="ruled">Notebook</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="legal">Yellow pad</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="blank">Blank</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="graph">Graph</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dot">Dot</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <PillCircleButton
            isNightMode={isNightMode}
            label="Minimize tools"
            onClick={() => onCollapsedChange(true)}
          >
            <ChevronUp className="h-5 w-5" strokeWidth={2} />
          </PillCircleButton>
        </ToolbarTray>
      </div>
    </div>
  );
}
