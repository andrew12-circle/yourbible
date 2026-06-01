# Sketch toolbar glyphs

**Source of truth:** `src/components/journal/sketch/SketchToolIcons.tsx`

Each icon is a **32×48** React SVG component — no cropping, no hidden art.

| Component | Tool id |
|-----------|---------|
| `FinePenIcon` | `fineline` |
| `FountainPenIcon` | `fountain` |
| `MarkerIcon` | `marker` |
| `PencilIcon` | `pencil` |
| `HighlighterIcon` | `highlighter` |
| `EraserIcon` | `eraser` |
| `RulerIcon` | `ruler` |
| `LassoIcon` | `lasso` |

## Usage

```tsx
import { FinePenIcon, MarkerIcon } from "@/components/journal/sketch/SketchToolIcons";

<FinePenIcon accentColor="#007AFF" />
<MarkerIcon accentColor="#FF3B30" />
```

Toolbar wiring: `SketchToolIcon` in `tool-icons/SketchToolIcon.tsx` maps `InkTool` → component.

Optional: export static `.svg` copies from Figma into this folder for design reference only.
