import { lazy, Suspense, useState } from "react";
import { Globe2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
const BibleEarthExplorer = lazy(() => import("./BibleEarthExplorer"));

export function BibleEarthButton({ book, chapter, translation }: { book: string; chapter: number; translation?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" aria-label="Explore this chapter in Google Earth" title="Explore this chapter in Google Earth" className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <Globe2 className="h-[18px] w-[18px]" aria-hidden="true" /><span>Earth</span>
        </button>
      </DialogTrigger>
      <DialogContent className="flex h-[92dvh] w-[96vw] max-w-6xl flex-col gap-3 overflow-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0 pr-6 text-left">
          <DialogTitle className="flex items-center gap-2"><Globe2 className="h-5 w-5" aria-hidden="true" /> Explore the Bible on Earth</DialogTitle>
          <DialogDescription>Open a biblical place in Google Earth without losing your reading position.</DialogDescription>
        </DialogHeader>
        {open && <Suspense fallback={<div role="status" className="flex items-center gap-2 p-6"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading atlas…</div>}>
          <BibleEarthExplorer key={`${book}:${chapter}:${translation}`} initialBook={book} initialChapter={chapter} initialTranslation={translation} onRead={() => setOpen(false)} />
        </Suspense>}
      </DialogContent>
    </Dialog>
  );
}
