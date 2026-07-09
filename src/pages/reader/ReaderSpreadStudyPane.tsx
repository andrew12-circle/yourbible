import { X } from "lucide-react";
import { ReaderSpreadMarkTools } from "@/components/reader/ReaderSpreadMarkTools";
import { ReaderCompanionColumn } from "@/pages/reader/ReaderCompanionColumn";
import { useCompanion, scopeRef } from "@/lib/reader/companionStore";
import { cn } from "@/lib/utils";

type Props = {
  side: "left" | "right";
  paletteId: string;
  highlightColor: string;
  currentColor?: string | null;
  currentlyUnderlined?: boolean;
  onPickHighlight: (cssVar: string) => void;
  onActiveColorChange: (cssVar: string) => void;
  onPickUnderline: () => void;
  onClear: () => void;
  pageClassName?: string;
};

/** Facing-page study column — colors + journal on the page opposite the selection. */
export function ReaderSpreadStudyPane({
  side,
  paletteId,
  highlightColor,
  currentColor,
  currentlyUnderlined,
  onPickHighlight,
  onActiveColorChange,
  onPickUnderline,
  onClear,
  pageClassName,
}: Props) {
  const { scope, setOpen } = useCompanion();

  return (
    <div
      data-reader-page-side={side}
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden bg-paper-warm/30 pt-10 pb-2",
        pageClassName,
      )}
    >
      <div className="flex-shrink-0 border-b border-paper-edge/80 bg-paper/90 px-4 py-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Study</p>
            <p className="truncate text-xs font-medium ink-text">
              {scope ? scopeRef(scope) : "Journal & marks"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-paper-warm hover:text-leather"
            title="Close study pane"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ReaderSpreadMarkTools
          paletteId={paletteId}
          currentColor={currentColor}
          activeColor={highlightColor}
          currentlyUnderlined={currentlyUnderlined}
          onPickHighlight={onPickHighlight}
          onActiveColorChange={onActiveColorChange}
          onPickUnderline={onPickUnderline}
          onClear={onClear}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ReaderCompanionColumn embedded />
      </div>
    </div>
  );
}
