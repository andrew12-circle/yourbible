import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Palette } from "lucide-react";
import VisualLibraryWorkspace from "@/components/bible/visual/explorer/VisualLibraryWorkspace";
import {
  EXPLORER_SECTIONS,
  type ExplorerSection,
} from "@/lib/visualBible/explorerModel";

function parseSection(value: string | null): ExplorerSection {
  return EXPLORER_SECTIONS.some((section) => section.id === value)
    ? value as ExplorerSection
    : "discover";
}

export default function VisualBibleExplorePage() {
  const [params] = useSearchParams();
  const query = params.get("q") ?? "";
  const section = parseSection(params.get("section"));
  const visual = params.get("visual") ?? undefined;

  return (
    <main className="mx-auto flex h-[calc(100dvh-5rem)] min-h-[32rem] w-full max-w-7xl flex-col gap-4 overflow-hidden p-3 sm:p-4 md:p-6">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/read/Gen/1"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background hover:bg-muted"
            aria-label="Back to Bible"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
              <Palette className="h-5 w-5 shrink-0" aria-hidden />
              Explore the Bible
            </h1>
            <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
              Artwork, maps, places, manuscripts and objects
            </p>
          </div>
        </div>
      </header>
      <section className="flex min-h-0 flex-1 overflow-hidden rounded-[24px] border bg-background shadow-sm">
        <VisualLibraryWorkspace
          initialQuery={query}
          initialSection={section}
          initialSelectedId={visual}
        />
      </section>
    </main>
  );
}
