import type { ChapterContextBundle } from "@/data/biblePlates/types";
import { ScripturePlate } from "@/components/bible/ScripturePlate";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { STUDY_MAPS } from "@/lib/bible/studyBackMatter";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ChapterContextBundle;
  bookName: string;
};

export function ChapterContextSheet({ open, onOpenChange, context, bookName }: Props) {
  const { chapter, plates, mapIds, timeline, relatedPassages } = context;
  const maps = STUDY_MAPS.filter((m) => mapIds.includes(m.id));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/60">
          <SheetTitle className="text-left font-serif">
            {bookName} {chapter}
          </SheetTitle>
          <SheetDescription className="text-left">
            Art, maps, and historical context for this chapter
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-4 space-y-8">
            {plates.length > 0 ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Artwork ({plates.length})
                </h3>
                <div className="space-y-6">
                  {plates.map((plate) => (
                    <div
                      key={plate.id}
                      className="rounded-lg overflow-hidden border border-border/50 bg-paper/40"
                    >
                      <ScripturePlate plate={plate} compact />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {maps.length > 0 ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Maps
                </h3>
                <div className="space-y-4">
                  {maps.map((map) => (
                    <figure key={map.id} className="rounded-lg overflow-hidden border border-border/50">
                      <img
                        src={map.imageUrl}
                        alt={map.alt}
                        className="w-full h-auto"
                        loading="lazy"
                        decoding="async"
                      />
                      <figcaption className="px-3 py-2 text-xs text-muted-foreground bg-paper/50">
                        <span className="font-medium text-foreground">{map.title}</span>
                        {" — "}
                        {map.caption}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            ) : null}

            {timeline.length > 0 ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Timeline
                </h3>
                <ul className="space-y-2 text-sm">
                  {timeline.map((ev) => (
                    <li
                      key={ev.id}
                      className="rounded-md border border-border/40 px-3 py-2 bg-muted/30"
                    >
                      <div className="font-medium">{ev.label}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {ev.approxYear}
                        {ev.empire ? ` · ${ev.empire}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {relatedPassages.length > 0 ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Related Scriptures
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {relatedPassages.map((ref) => (
                    <li
                      key={ref}
                      className="text-sm rounded-full border border-border/50 px-3 py-1 bg-paper/60"
                    >
                      {ref}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
