import { useState } from "react";
import {
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
import {
  IconEraser,
  IconFineline,
  IconFountain,
  IconHighlighter,
  IconLasso,
  IconMarker,
  IconPencil,
  IconRainbowSwatch,
  IconRuler,
} from "./SketchToolIcons";

export type SketchPaper = "blank" | "ruled" | "graph" | "dot";

type PenColor = { name: string; value: string };

type Props = {
  isNightMode: boolean;
  minimized: boolean;
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
  onToolChange: (tool: InkTool) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onPaperChange: (paper: SketchPaper) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDrawWithFingerChange: (v: boolean) => void;
  onRulerVisibleChange: (v: boolean) => void;
  onSnapToRulerChange: (v: boolean) => void;
  onAutoMinimizeChange: (v: boolean) => void;
  autoMinimize: boolean;
  customColorInputRef?: React.RefObject<HTMLInputElement | null>;
};

const TOOL_ITEMS: {
  id: InkTool;
  label: string;
  Icon: React.ComponentType<{ active?: boolean }>;
}[] = [
  { id: "pencil", label: "Pencil", Icon: IconPencil },
  { id: "fineline", label: "Fine tip", Icon: IconFineline },
  { id: "fountain", label: "Fountain pen", Icon: IconFountain },
  { id: "marker", label: "Marker", Icon: IconMarker },
  { id: "highlighter", label: "Highlighter", Icon: IconHighlighter },
  { id: "eraser", label: "Eraser", Icon: IconEraser },
  { id: "ruler", label: "Ruler", Icon: IconRuler },
  { id: "lasso", label: "Lasso", Icon: IconLasso },
];

const PALETTE = [
  { name: "White", value: "#f8fafc" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Red", value: "#ef4444" },
] as const;

function InkToolButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-11 w-9 shrink-0 flex-col items-center justify-end rounded-lg pb-0.5 transition",
        active
          ? "bg-white/20 ring-1 ring-white/35"
          : "hover:bg-white/10 opacity-90 hover:opacity-100",
      )}
    >
      {children}
    </button>
  );
}

export default function SketchInkToolbar({
  isNightMode,
  minimized,
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
  onToolChange,
  onColorChange,
  onSizeChange,
  onPaperChange,
  onUndo,
  onRedo,
  onClear,
  onDrawWithFingerChange,
  onRulerVisibleChange,
  onSnapToRulerChange,
  onAutoMinimizeChange,
  autoMinimize,
  customColorInputRef,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isDrawTool = tool !== "ruler" && tool !== "lasso";
  const displayColors = isNightMode ? PALETTE : PALETTE;

  const selectTool = (next: InkTool) => {
    onToolChange(next);
    if (next !== "eraser" && next !== "ruler" && next !== "lasso") {
      const preset = INK_TOOL_PRESETS[next as InkDrawTool];
      onSizeChange(preset.defaultSize);
      if (preset.defaultColor) onColorChange(preset.defaultColor);
    }
    if (next === "ruler") onRulerVisibleChange(true);
  };

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center px-2 transition-all duration-300 sm:top-3",
        minimized && "translate-y-[-120%] opacity-0",
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div
        role="toolbar"
        aria-label="Handwritten markup tools"
        className={cn(
          "pointer-events-auto flex max-w-[min(100%,42rem)] items-center gap-1 rounded-2xl border px-1.5 py-1 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl",
          isNightMode
            ? "border-white/12 bg-neutral-900/92 text-slate-100"
            : "border-black/10 bg-neutral-800/90 text-white",
        )}
        style={{ touchAction: "manipulation" }}
      >
        <div className="flex items-center gap-0.5 rounded-xl bg-black/25 px-0.5 py-0.5">
          <button
            type="button"
            onClick={onUndo}
            disabled={!hasStrokes}
            aria-label="Undo"
            className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-35 hover:bg-white/10"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={redoCount === 0}
            aria-label="Redo"
            className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-35 hover:bg-white/10"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-0.5 h-9 w-px bg-white/15" aria-hidden />

        <div className="flex items-end gap-0.5 overflow-x-auto scrollbar-hide max-w-[min(52vw,280px)]">
          {TOOL_ITEMS.map(({ id, label, Icon }) => (
            <InkToolButton
              key={id}
              active={tool === id || (id === "ruler" && rulerVisible)}
              label={label}
              onClick={() => selectTool(id)}
            >
              <Icon active={tool === id || (id === "ruler" && rulerVisible)} />
            </InkToolButton>
          ))}
        </div>

        <div className="mx-0.5 h-9 w-px bg-white/15" aria-hidden />

        <div className="grid grid-cols-3 gap-1 p-0.5" role="group" aria-label="Colors">
          {displayColors.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.name}
              aria-label={`Color ${c.name}`}
              disabled={!isDrawTool}
              onClick={() => onColorChange(c.value)}
              className={cn(
                "h-5 w-5 rounded-full border border-white/25 transition hover:scale-110 disabled:opacity-40",
                color === c.value && isDrawTool && "ring-2 ring-white ring-offset-1 ring-offset-neutral-800",
              )}
              style={{ background: c.value }}
            />
          ))}
          <button
            type="button"
            title="Custom color"
            aria-label="Custom color"
            disabled={!isDrawTool}
            onClick={() => customColorInputRef?.current?.click()}
            className="flex h-5 w-5 items-center justify-center rounded-full disabled:opacity-40"
          >
            <IconRainbowSwatch className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-0.5 h-9 w-px bg-white/15" aria-hidden />

        <button
          type="button"
          aria-label="Stroke size"
          title={`Size ${size}`}
          disabled={!isDrawTool}
          onClick={() => {
            const sizes = [2, 4, 6, 10, 16, 20];
            const idx = sizes.indexOf(size);
            onSizeChange(sizes[(idx + 1) % sizes.length] ?? 4);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-35 hover:bg-white/10"
        >
          <span
            className="block rounded-full bg-current"
            style={{ width: Math.min(size, 12), height: Math.min(size, 12) }}
          />
        </button>

        <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More tools"
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Markup</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={autoMinimize}
              onCheckedChange={(v) => onAutoMinimizeChange(v === true)}
            >
              Auto-minimize toolbar
            </DropdownMenuCheckboxItem>
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
              <DropdownMenuRadioItem value="blank">
                <Square className="mr-2 h-3.5 w-3.5" /> Blank
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="graph">
                <Grid2X2 className="mr-2 h-3.5 w-3.5" /> Graph
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dot">Dot grid</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClear} disabled={!hasStrokes} className="text-destructive">
              <RotateCcw className="mr-2 h-3.5 w-3.5" /> Clear page
            </DropdownMenuItem>
            {penColors.length > 6 ? (
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Paper and options"
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Paper</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={paper} onValueChange={(v) => onPaperChange(v as SketchPaper)}>
              <DropdownMenuRadioItem value="ruled">Notebook</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="blank">Blank</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="graph">Graph</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dot">Dot</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
