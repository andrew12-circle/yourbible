import { useState } from "react";
import { MoreHorizontal, Redo2, RotateCcw, Undo2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InkToolSilhouette, InkToolSilhouetteSlot } from "@/components/journal/sketch/InkToolSilhouette";
import { SKETCH_TOOL_ITEMS } from "@/components/journal/sketch/SketchInkToolbar";
import { INK_ERASER_SIZES } from "@/lib/ink/eraser";
import { INK_TOOL_PRESETS } from "@/lib/ink/toolPresets";
import { INK_PEN_SIZES } from "@/lib/ink/strokeRender";
import type { InkDrawTool, InkTool } from "@/lib/ink/types";
import { cn } from "@/lib/utils";

const READER_PEN_TOOLS = SKETCH_TOOL_ITEMS.filter((t) => t.id !== "ruler");
const READER_ERASER = SKETCH_TOOL_ITEMS.find((t) => t.id === "eraser")!;
const READER_MOBILE_TOOLS = [...READER_PEN_TOOLS.filter((t) => t.id !== "eraser"), READER_ERASER];

const APPLE_PALETTE = [
  { name: "White", value: "#ffffff" },
  { name: "Blue", value: "#007aff" },
  { name: "Green", value: "#34c759" },
  { name: "Yellow", value: "#ffcc00" },
  { name: "Red", value: "#ff3b30" },
] as const;

const COLOR_SWATCH_SHADOW =
  "shadow-[inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(0,0,0,0.12),0_4px_10px_rgba(0,0,0,0.08)]";

function normalizeHex(c: string) {
  return c.trim().toLowerCase();
}

function colorMatchesPalette(current: string, swatch: string) {
  return normalizeHex(current) === normalizeHex(swatch);
}

type Props = {
  tool: InkTool;
  color: string;
  size: number;
  hasStrokes: boolean;
  redoCount: number;
  onCollapsedChange: (collapsed: boolean) => void;
  onToolChange: (tool: InkTool) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onClearChapterInk?: () => void;
  customColorInputRef?: React.RefObject<HTMLInputElement | null>;
};

export function ReaderCompactInkToolbar({
  tool,
  color,
  size,
  hasStrokes,
  redoCount,
  onCollapsedChange,
  onToolChange,
  onColorChange,
  onSizeChange,
  onUndo,
  onRedo,
  onClear,
  onClearChapterInk,
  customColorInputRef,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const isEraser = tool === "eraser";
  const isDrawTool = tool !== "ruler" && tool !== "lasso";
  const canPickColor = !isEraser;
  const customColorActive =
    isDrawTool && !APPLE_PALETTE.some((c) => colorMatchesPalette(color, c.value));

  const selectTool = (next: InkTool) => {
    onToolChange(next);
    if (next === "eraser") {
      onSizeChange(INK_TOOL_PRESETS.eraser.defaultSize);
    } else if (next !== "ruler" && next !== "lasso") {
      const preset = INK_TOOL_PRESETS[next as InkDrawTool];
      onSizeChange(preset.defaultSize);
      if (preset.defaultColor) onColorChange(preset.defaultColor);
    }
  };

  return (
    <div
      role="toolbar"
      aria-label="Bible page ink tools"
      data-reader-ink-toolbar=""
      data-reader-ink-toolbar-compact=""
      className={cn(
        "pointer-events-auto flex h-[58px] w-full min-w-0 items-center gap-0.5 rounded-full border px-1.5",
        "border-[rgba(255,255,255,0.9)] bg-[rgba(255,255,255,0.82)] backdrop-blur-[36px] backdrop-saturate-[180%]",
        "shadow-[0_20px_48px_rgba(0,0,0,0.16),0_4px_10px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.98),inset_0_-1px_0_rgba(0,0,0,0.04)]",
      )}
      style={{ touchAction: "manipulation" }}
    >
      <div
        aria-label="Drawing tools"
        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto rounded-2xl bg-black/[0.045] px-0.5 scrollbar-hide"
      >
        {READER_MOBILE_TOOLS.map(({ id, label }) => {
          const active = tool === id;
          return (
            <InkToolSilhouetteSlot
              key={id}
              tool={id}
              active={active}
              isNightMode={false}
              accentColor={
                active && id !== "eraser" && id !== "ruler" && id !== "lasso" ? color : undefined
              }
              label={label}
              onClick={() => selectTool(id)}
            />
          );
        })}
      </div>

      <div
        className="mx-0.5 h-11 w-px shrink-0 self-center bg-gradient-to-b from-transparent via-black/12 to-transparent"
        aria-hidden
      />

      <DropdownMenu open={colorOpen} onOpenChange={setColorOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="Ink color"
            aria-label="Ink color"
            aria-expanded={colorOpen}
            disabled={!canPickColor}
            className={cn(
              "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/90 transition active:scale-95 disabled:opacity-40",
              COLOR_SWATCH_SHADOW,
              customColorActive && "ring-[1.5px] ring-white/95 ring-offset-1 ring-offset-[rgba(255,255,255,0.78)]",
            )}
            style={{ background: canPickColor ? color : "#94a3b8" }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="z-[100] w-44 p-2">
          <DropdownMenuLabel className="text-xs">Color</DropdownMenuLabel>
          <div className="grid grid-cols-3 gap-2 p-1" role="group">
            {APPLE_PALETTE.map((c) => {
              const selected = colorMatchesPalette(color, c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  aria-label={`Color ${c.name}`}
                  aria-pressed={selected}
                  onClick={() => {
                    onColorChange(c.value);
                    setColorOpen(false);
                  }}
                  className={cn(
                    "h-8 w-8 rounded-full border border-white/90 transition active:scale-95",
                    COLOR_SWATCH_SHADOW,
                    selected && "ring-2 ring-white/95 ring-offset-1 ring-offset-[rgba(255,255,255,0.78)]",
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
              onClick={() => {
                customColorInputRef?.current?.click();
                setColorOpen(false);
              }}
              className={cn(
                "h-8 w-8 rounded-full border border-white/90",
                COLOR_SWATCH_SHADOW,
                customColorActive && "ring-2 ring-white/95 ring-offset-1 ring-offset-[rgba(255,255,255,0.78)]",
              )}
              style={{
                background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
              }}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="More ink tools"
            title="More"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-none bg-[rgba(245,245,247,0.85)] text-neutral-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_6px_16px_rgba(0,0,0,0.08)] transition active:scale-95"
          >
            <MoreHorizontal className="h-5 w-5" strokeWidth={2} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-[100] w-56">
          <DropdownMenuItem onClick={onUndo} disabled={!hasStrokes}>
            <Undo2 className="mr-2 h-3.5 w-3.5" /> Undo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRedo} disabled={redoCount === 0}>
            <Redo2 className="mr-2 h-3.5 w-3.5" /> Redo
            {redoCount > 0 ? ` (${redoCount})` : ""}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {!isEraser ? (
            <>
              <DropdownMenuLabel>Stroke size</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={String(size)}
                onValueChange={(v) => onSizeChange(Number(v))}
              >
                {INK_PEN_SIZES.map((s) => (
                  <DropdownMenuRadioItem key={s} value={String(s)}>
                    {s}px
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem onClick={() => selectTool("lasso")}>Lasso</DropdownMenuItem>
          <DropdownMenuItem onClick={() => selectTool("eraser")}>Eraser</DropdownMenuItem>
          {isEraser ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Eraser size</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={String(size)}
                onValueChange={(v) => {
                  selectTool("eraser");
                  onSizeChange(Number(v));
                }}
              >
                {INK_ERASER_SIZES.map((s) => (
                  <DropdownMenuRadioItem key={s} value={String(s)}>
                    {s === 16 ? "Small" : s === 36 ? "Medium" : s === 72 ? "Large" : s === 96 ? "Extra large" : `${s}px`}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onClear} disabled={!hasStrokes} className="text-destructive">
            <RotateCcw className="mr-2 h-3.5 w-3.5" /> Clear this page
          </DropdownMenuItem>
          {onClearChapterInk ? (
            <DropdownMenuItem
              onClick={onClearChapterInk}
              className="text-destructive focus:text-destructive"
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" /> Clear chapter ink
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        type="button"
        aria-label="Minimize ink tools"
        title="Minimize"
        onClick={() => onCollapsedChange(true)}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-none bg-[rgba(245,245,247,0.85)] text-neutral-500 transition active:scale-95"
      >
        <span className="block h-0.5 w-3.5 rounded-full bg-current" aria-hidden />
      </button>
    </div>
  );
}

export function ReaderCompactInkCollapsedChip({
  tool,
  color,
  onExpand,
}: {
  tool: InkTool;
  color: string;
  onExpand: () => void;
}) {
  const isDrawTool = tool !== "ruler" && tool !== "lasso" && tool !== "eraser";

  return (
    <button
      type="button"
      onClick={onExpand}
      aria-label="Show ink tools"
      aria-expanded={false}
      data-reader-ink-toolbar=""
      data-reader-ink-toolbar-compact=""
      className={cn(
        "pointer-events-auto relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-[3px] border-black/[0.08] bg-[rgba(255,255,255,0.72)] shadow-lg backdrop-blur-[32px] transition active:scale-95",
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
  );
}
