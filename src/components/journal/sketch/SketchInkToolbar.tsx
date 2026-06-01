import { useState } from "react";
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
  SketchToolIcon,
} from "./SketchToolIcons";

export type SketchPaper = "blank" | "ruled" | "graph" | "dot";

type PenColor = { name: string; value: string };

export const SKETCH_TOOL_ITEMS: {
  id: InkTool;
  label: string;
  Icon: React.ComponentType<{ active?: boolean; variant?: "toolbar" | "chip" }>;
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

type Props = {
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
  onRulerVisibleChange: (v: boolean) => void;
  onSnapToRulerChange: (v: boolean) => void;
  customColorInputRef?: React.RefObject<HTMLInputElement | null>;
};

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
        "flex h-[52px] w-10 shrink-0 flex-col items-center justify-end rounded-xl pb-1 transition",
        active
          ? "bg-white/15 ring-1 ring-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          : "hover:bg-white/10 opacity-85 hover:opacity-100",
      )}
    >
      {children}
    </button>
  );
}

export default function SketchInkToolbar({
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
  onRulerVisibleChange,
  onSnapToRulerChange,
  customColorInputRef,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isDrawTool = tool !== "ruler" && tool !== "lasso";

  const selectTool = (next: InkTool) => {
    onToolChange(next);
    if (next !== "eraser" && next !== "ruler" && next !== "lasso") {
      const preset = INK_TOOL_PRESETS[next as InkDrawTool];
      onSizeChange(preset.defaultSize);
      if (preset.defaultColor) onColorChange(preset.defaultColor);
    }
    if (next === "ruler") onRulerVisibleChange(true);
  };

  const barChrome = cn(
    "flex-shrink-0 border-b",
    isNightMode ? "border-white/10 bg-neutral-900" : "border-border/60 bg-neutral-100",
  );

  if (collapsed) {
    return (
      <div className={cn(barChrome, "flex items-center justify-center py-2")}>
        <button
          type="button"
          onClick={() => onCollapsedChange(false)}
          aria-label="Show markup tools"
          aria-expanded={false}
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] shadow-lg transition active:scale-95",
            isNightMode
              ? "border-white/25 bg-neutral-800 hover:bg-neutral-700"
              : "border-neutral-300 bg-white hover:bg-neutral-50",
          )}
          style={{ borderColor: isDrawTool ? color : undefined }}
        >
          <span
            className="absolute inset-1 rounded-full opacity-20"
            style={{ background: isDrawTool ? color : "#94a3b8" }}
            aria-hidden
          />
          <SketchToolIcon tool={tool} active variant="chip" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn(barChrome, "relative z-20")}>
      <div
        role="toolbar"
        aria-label="Handwritten markup tools"
        className={cn(
          "mx-auto flex w-full max-w-6xl items-center gap-1 px-2 py-1.5",
          tabletPortrait && "max-w-[min(100%,52rem)] gap-1.5 px-3",
        )}
        style={{ touchAction: "manipulation" }}
      >
        <div
          className={cn(
            "flex items-center gap-0.5 rounded-xl px-0.5 py-0.5",
            isNightMode ? "bg-black/30" : "bg-black/10",
          )}
        >
          <button
            type="button"
            onClick={onUndo}
            disabled={!hasStrokes}
            aria-label="Undo"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg disabled:opacity-35",
              isNightMode ? "hover:bg-white/10" : "hover:bg-black/10",
            )}
          >
            <Undo2 className={cn("h-4 w-4", isNightMode ? "text-slate-100" : "text-neutral-800")} />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={redoCount === 0}
            aria-label="Redo"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg disabled:opacity-35",
              isNightMode ? "hover:bg-white/10" : "hover:bg-black/10",
            )}
          >
            <Redo2 className={cn("h-4 w-4", isNightMode ? "text-slate-100" : "text-neutral-800")} />
          </button>
        </div>

        <div
          className={cn("mx-0.5 h-10 w-px shrink-0", isNightMode ? "bg-white/15" : "bg-black/15")}
          aria-hidden
        />

        <div
          className={cn(
            "flex min-w-0 flex-1 items-end justify-center gap-0.5 overflow-x-auto scrollbar-hide",
          )}
        >
          {SKETCH_TOOL_ITEMS.map(({ id, label, Icon }) => (
            <InkToolButton
              key={id}
              active={tool === id || (id === "ruler" && rulerVisible)}
              label={label}
              onClick={() => selectTool(id)}
            >
              <Icon active={tool === id || (id === "ruler" && rulerVisible)} variant="toolbar" />
            </InkToolButton>
          ))}
        </div>

        <div
          className={cn("mx-0.5 h-10 w-px shrink-0", isNightMode ? "bg-white/15" : "bg-black/15")}
          aria-hidden
        />

        <div className="grid shrink-0 grid-cols-3 gap-1" role="group" aria-label="Colors">
          {PALETTE.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.name}
              aria-label={`Color ${c.name}`}
              disabled={!isDrawTool}
              onClick={() => onColorChange(c.value)}
              className={cn(
                "h-5 w-5 rounded-full border transition hover:scale-110 disabled:opacity-40",
                isNightMode ? "border-white/30" : "border-black/15",
                color === c.value &&
                  isDrawTool &&
                  "ring-2 ring-offset-1",
                color === c.value && isDrawTool && (isNightMode ? "ring-sky-300 ring-offset-neutral-900" : "ring-blue-500 ring-offset-neutral-100"),
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
            <IconRainbowSwatch />
          </button>
        </div>

        <div
          className={cn("mx-0.5 h-10 w-px shrink-0", isNightMode ? "bg-white/15" : "bg-black/15")}
          aria-hidden
        />

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
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-35",
            isNightMode ? "hover:bg-white/10" : "hover:bg-black/10",
          )}
        >
          <span
            className="block rounded-full"
            style={{
              width: Math.min(size, 12),
              height: Math.min(size, 12),
              background: isDrawTool ? color : isNightMode ? "#94a3b8" : "#64748b",
            }}
          />
        </button>

        <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="More tools"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                isNightMode ? "hover:bg-white/10" : "hover:bg-black/10",
              )}
            >
              <MoreHorizontal className={cn("h-4 w-4", isNightMode ? "text-slate-100" : "text-neutral-800")} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
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
              aria-label="Paper type"
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                isNightMode ? "hover:bg-white/10" : "hover:bg-black/10",
              )}
            >
              <Plus className={cn("h-4 w-4", isNightMode ? "text-slate-100" : "text-neutral-800")} />
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

        <button
          type="button"
          onClick={() => onCollapsedChange(true)}
          aria-label="Minimize tools"
          title="Minimize tools"
          className={cn(
            "ml-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isNightMode ? "hover:bg-white/10 text-slate-200" : "hover:bg-black/10 text-neutral-700",
          )}
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
