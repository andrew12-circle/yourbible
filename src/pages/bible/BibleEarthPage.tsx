import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, Globe2 } from "lucide-react";
import BibleEarthExplorer from "@/components/bible/earth/BibleEarthExplorer";

export default function BibleEarthPage() {
  const [params] = useSearchParams();
  const book = params.get("book") ?? undefined;
  const chapter = Number(params.get("chapter"));
  const translation = params.get("translation") ?? "all";
  return (
    <main className="mx-auto flex h-[calc(100dvh-5rem)] min-h-[32rem] w-full max-w-7xl flex-col gap-4 overflow-hidden p-4 md:p-6">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div><h1 className="flex items-center gap-2 text-2xl font-semibold"><Globe2 className="h-6 w-6" aria-hidden="true" />Bible Earth</h1><p className="mt-1 text-sm text-muted-foreground">Explore biblical places, compare candidates, and open Google Earth.</p></div>
        <Link to="/read/Gen/1" className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><BookOpen className="h-4 w-4" aria-hidden="true" />Open Bible</Link>
      </header>
      <BibleEarthExplorer key={`${book}:${chapter}:${translation}`} initialBook={book} initialChapter={Number.isInteger(chapter) && chapter > 0 ? chapter : undefined} initialTranslation={translation} />
    </main>
  );
}
