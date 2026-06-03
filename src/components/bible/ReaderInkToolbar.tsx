import { useRef } from "react";
import SketchInkToolbar, { type SketchPaper } from "@/components/journal/sketch/SketchInkToolbar";
import { INK_TOOL_PRESETS } from "@/lib/ink/toolPresets";
import type { InkDrawTool, InkTool } from "@/lib/ink/types";
import { getSketchPenColors } from "@/lib/journal/sketchInkColors";
import { cn } from "@/lib/utils";

type Props = {
  tool: InkTool;
  color: string;
  size: number;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  hasStrokes: boolean;
  redoCount: number;
  tabletPortrait?: boolean;
  compactInkLayout?: boolean;
  onTool: (t: InkTool) => void;
  onColor: (c: string) => void;
  onSize: (n: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onClearChapterInk?: () => void;
};

const NOOP_PAPER: SketchPaper = "blank";

export function ReaderInkToolbar({
  tool,
  color,
  size,
  collapsed,
  onCollapsedChange,
  hasStrokes,
  redoCount,
  tabletPortrait = false,
  compactInkLayout = false,
  onTool,
  onColor,
  onSize,
  onUndo,
  onRedo,
  onClear,
  onClearChapterInk,
}: Props) {
  const customColorRef = useRef<HTMLInputElement | null>(null);
  const penColors = getSketchPenColors(false);

  const handleToolChange = (next: InkTool) => {
    onTool(next);
    if (next !== "eraser" && next !== "ruler" && next !== "lasso") {
      const preset = INK_TOOL_PRESETS[next as InkDrawTool];
      onSize(preset.defaultSize);
      if (preset.defaultColor) onColor(preset.defaultColor);
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-[36] flex",
        compactInkLayout
          ? "left-[max(0.5rem,env(safe-area-inset-left,0px))] right-[max(0.5rem,env(safe-area-inset-right,0px))]"
          : "inset-x-0 px-3",
        collapsed ? "justify-end" : "justify-center",
        tabletPortrait
          ? "top-[calc(var(--safe-area-inset-top)+3rem)]"
          : compactInkLayout
            ? "top-[calc(var(--safe-area-inset-top)+3.5rem)]"
            : "top-[calc(var(--safe-area-inset-top)+3.25rem)]",
      )}
    >
      <input
        ref={customColorRef}
        type="color"
        className="sr-only"
        value={color}
        onChange={(e) => {
          onColor(e.target.value);
          if (tool === "eraser") handleToolChange("fountain");
        }}
        aria-hidden
        tabIndex={-1}
      />
      <div
        className={cn(
          "pointer-events-auto flex min-w-0",
          collapsed
            ? "justify-end"
            : cn(
                "w-full justify-center",
                compactInkLayout ? "max-w-full" : "max-w-[100vw]",
              ),
        )}
      >
        <SketchInkToolbar
          variant="reader"
          isNightMode={false}
          collapsed={collapsed}
          onCollapsedChange={onCollapsedChange}
          collapsedAnchor="end"
          tabletPortrait={tabletPortrait}
          compactInkLayout={compactInkLayout}
          tool={tool}
          color={color}
          size={size}
          penColors={penColors}
          paper={NOOP_PAPER}
          hasStrokes={hasStrokes}
          redoCount={redoCount}
          drawWithFinger
          rulerVisible={false}
          snapToRuler={false}
          onToolChange={handleToolChange}
          onColorChange={(c) => {
            onColor(c);
            if (tool === "eraser") handleToolChange("fountain");
          }}
          onSizeChange={onSize}
          onPaperChange={() => {}}
          onUndo={onUndo}
          onRedo={onRedo}
          onClear={onClear}
          onClearChapterInk={onClearChapterInk}
          onDrawWithFingerChange={() => {}}
          onSnapToRulerChange={() => {}}
          customColorInputRef={customColorRef}
        />
      </div>
    </div>
  );
}
