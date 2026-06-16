import { type ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  MIND_NODE_COLORS,
  type MindGraphFilters,
} from "@/lib/graph/unifiedMindGraph";
import { cn } from "@/lib/utils";

export const MIND_GRAPH_FILTER_LABELS: {
  key: keyof MindGraphFilters;
  label: string;
  color: string;
}[] = [
  { key: "entry", label: "Journal", color: MIND_NODE_COLORS.entry },
  { key: "belief", label: "Beliefs", color: MIND_NODE_COLORS.belief },
  { key: "artifact", label: "Videos & books", color: MIND_NODE_COLORS.artifact },
  { key: "entity", label: "People", color: MIND_NODE_COLORS.entity },
  { key: "verse", label: "Scripture", color: MIND_NODE_COLORS.verse },
  { key: "claim", label: "Claims", color: MIND_NODE_COLORS.claim },
];

type Props = {
  filters: MindGraphFilters;
  onToggle: (key: keyof MindGraphFilters) => void;
  statsLine: string;
  menuExtra?: ReactNode;
  className?: string;
};

export function MindGraphFiltersMenu({
  filters,
  onToggle,
  statsLine,
  menuExtra,
  className,
}: Props) {
  const activeCount = MIND_GRAPH_FILTER_LABELS.filter(({ key }) => filters[key]).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("relative h-8 w-8 shrink-0 rounded-lg", className)}
          aria-label="Mind map options"
        >
          <Menu className="h-4 w-4" aria-hidden />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
            {activeCount}
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-[min(100%,300px)] flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border/60 px-4 py-3 text-left">
          <SheetTitle className="font-display text-base font-normal">Mind map</SheetTitle>
          <p className="text-xs text-muted-foreground">{statsLine}</p>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div>
            <p className="mb-3 text-xs font-medium text-muted-foreground">Show on map</p>
            <div className="space-y-3">
              {MIND_GRAPH_FILTER_LABELS.map(({ key, label, color }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <Label
                    htmlFor={`mind-filter-menu-${key}`}
                    className="flex min-w-0 flex-1 items-center gap-2 text-sm text-foreground"
                  >
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                    {label}
                  </Label>
                  <Switch
                    id={`mind-filter-menu-${key}`}
                    checked={filters[key]}
                    onCheckedChange={() => onToggle(key)}
                  />
                </div>
              ))}
            </div>
          </div>
          {menuExtra ? <div className="space-y-4 border-t border-border/60 pt-4">{menuExtra}</div> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
