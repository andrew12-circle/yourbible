import { ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChildrenBookGoldFlourish } from "@/components/children-books/ChildrenBookGoldFlourish";
import { SpreadPageSpineShade } from "@/components/children-books/SpreadPageSpineShade";
import { StorySymbol } from "@/components/children-books/ChildrenBookSymbols";
import { childrenBookPagePadding } from "@/lib/children-books/pageMargins";
import type { ChildrenBookPage } from "@/lib/children-books/storybook";
import type { SpreadSideKind } from "@/lib/children-books/spreadLayout";
import { cn } from "@/lib/utils";

const paletteClasses: Record<ChildrenBookPage["palette"], string> = {
  dawn: "from-amber-100 via-rose-50 to-sky-100",
  garden: "from-emerald-100 via-lime-50 to-rose-100",
  royal: "from-violet-100 via-amber-50 to-rose-100",
  starlight: "from-indigo-100 via-sky-50 to-amber-100",
  coastal: "from-cyan-100 via-sky-50 to-emerald-100",
  "home-daylight": "from-sky-50 via-white to-blue-100",
};

type ChildrenBookArtPageProps = {
  page: ChildrenBookPage;
  side: "left" | "right";
  singlePage: boolean;
  compactChrome?: boolean;
  imageUrl?: string;
  loaded: boolean;
  failed: boolean;
  generating: boolean;
  pan?: Extract<SpreadSideKind, "art-pan-left" | "art-pan-right">;
  onLoad: () => void;
  onError: () => void;
  onOpenIllustration: () => void;
};

export function ChildrenBookArtPage({
  page,
  side,
  singlePage,
  compactChrome,
  imageUrl,
  loaded,
  failed,
  generating,
  pan,
  onLoad,
  onError,
  onOpenIllustration,
}: ChildrenBookArtPageProps) {
  const showImage = Boolean(imageUrl) && !failed;
  const isPan = pan === "art-pan-left" || pan === "art-pan-right";

  return (
    <article
      className="relative h-full min-h-0 overflow-hidden bg-paper"
      style={childrenBookPagePadding(side, "art", singlePage, compactChrome)}
    >
      <SpreadPageSpineShade side={side} spread={!singlePage} />
      {generating && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/25 backdrop-blur-[1px]">
          <Loader2 className="h-8 w-8 animate-spin text-white drop-shadow" aria-hidden />
          <span className="text-xs font-medium text-white drop-shadow">Painting illustration…</span>
        </div>
      )}

      {showImage ? (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={imageUrl}
            alt={page.imageAlt ?? page.title}
            className={cn(
              "absolute top-0 h-full max-w-none object-cover transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0",
              isPan ? "w-[200%]" : "inset-0 w-full",
              pan === "art-pan-left" && "left-0",
              pan === "art-pan-right" && "left-[-100%]",
            )}
            loading="lazy"
            onLoad={onLoad}
            onError={onError}
          />
        </div>
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br p-6 text-center",
            paletteClasses[page.palette],
          )}
        >
          <StorySymbol symbol={page.symbol} />
          <p className="mt-4 max-w-xs text-xs leading-relaxed text-leather/75 sm:text-sm">
            {page.picturePrompt}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4 rounded-full bg-white/80"
            onClick={onOpenIllustration}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <ImageIcon className="h-3.5 w-3.5" aria-hidden />
            )}
            {generating ? "Generating…" : "Generate illustration"}
          </Button>
        </div>
      )}

      {!loaded && showImage && (
        <div className={cn("absolute inset-0 bg-gradient-to-br", paletteClasses[page.palette])} />
      )}
    </article>
  );
}

type ChildrenBookOrnamentPageProps = {
  page: ChildrenBookPage;
  side: "left" | "right";
  singlePage: boolean;
  compactChrome?: boolean;
};

export function ChildrenBookOrnamentPage({
  page,
  side,
  singlePage,
  compactChrome,
}: ChildrenBookOrnamentPageProps) {
  return (
    <article
      className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#faf6ee_0%,#f3ecdf_100%)]"
      style={childrenBookPagePadding(side, "ornament", singlePage, compactChrome)}
    >
      <SpreadPageSpineShade side={side} spread={!singlePage} />
      <StorySymbol symbol={page.symbol} compact />
      <ChildrenBookGoldFlourish className="mt-6" />
    </article>
  );
}
