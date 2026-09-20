import { lazy, Suspense } from "react";
import type { ChapterContextBundle } from "@/data/biblePlates/types";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
const VisualBibleLibrary = lazy(() => import("./visual/VisualBibleLibrary").then((module) => ({ default: module.VisualBibleLibrary })));

type Props = { open: boolean; onOpenChange: (open: boolean) => void; context: ChapterContextBundle; bookName: string };
export function ChapterContextSheet({ open, onOpenChange, context, bookName }: Props) {
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-3xl">
      <SheetHeader className="border-b border-border/60 px-4 pb-3 pt-4 pr-12">
        <SheetTitle className="text-left font-serif">{bookName} {context.chapter}</SheetTitle>
        <SheetDescription className="text-left">Visualize this passage through art, maps, artifacts and historical context.</SheetDescription>
      </SheetHeader>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-8 px-4 py-5">
          {/* Closed overlays never mount the catalog or request its thumbnails. */}
          {open ? <Suspense fallback={<p role="status">Opening chapter visuals…</p>}>
            <VisualBibleLibrary book={context.bookAbbr} chapter={context.chapter} onNavigate={() => onOpenChange(false)} />
          </Suspense> : null}
          {context.timeline.length ? <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Existing chronology notes</h3>
            <p className="mb-2 text-xs text-muted-foreground">Inherited study chronology; dates may reflect particular historical reconstructions.</p>
            <ul className="space-y-2 text-sm">{context.timeline.map((event) => <li key={event.id} className="rounded-md border p-3">
              <p className="font-medium">{event.label}</p><p className="text-xs text-muted-foreground">{event.approxYear}{event.empire ? ` · ${event.empire}` : ""}</p>
            </li>)}</ul>
          </section> : null}
          {context.relatedPassages.length ? <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related Scriptures</h3>
            <ul className="flex flex-wrap gap-2">{context.relatedPassages.map((ref) => <li key={ref} className="rounded-full border px-3 py-1 text-sm">{ref}</li>)}</ul>
          </section> : null}
        </div>
      </ScrollArea>
    </SheetContent>
  </Sheet>;
}
