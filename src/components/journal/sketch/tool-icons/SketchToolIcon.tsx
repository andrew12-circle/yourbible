import type { ComponentType } from "react";
import type { InkTool } from "@/lib/ink/types";
import {
  EraserIcon,
  FinePenIcon,
  FountainPenIcon,
  HighlighterIcon,
  LassoIcon,
  MarkerIcon,
  PencilIcon,
  RulerIcon,
  type SketchToolIconProps,
} from "../SketchToolIcons";

const TOOL_ICONS: Record<InkTool, ComponentType<SketchToolIconProps>> = {
  fineline: FinePenIcon,
  fountain: FountainPenIcon,
  marker: MarkerIcon,
  pencil: PencilIcon,
  highlighter: HighlighterIcon,
  eraser: EraserIcon,
  ruler: RulerIcon,
  lasso: LassoIcon,
};

export function SketchToolIcon({
  tool,
  className,
  active,
  accentColor,
}: SketchToolIconProps & { tool: InkTool }) {
  const Icon = TOOL_ICONS[tool] ?? FountainPenIcon;
  const accent =
    accentColor ??
    (tool === "fineline"
      ? "#007AFF"
      : tool === "marker"
        ? "#FF3B30"
        : tool === "fountain"
          ? "#111827"
          : undefined);

  return <Icon className={className} active={active} accentColor={accent} />;
}
