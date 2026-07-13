import { ImageIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChildrenBookGoldFlourish } from "@/components/children-books/ChildrenBookGoldFlourish";
import { SpreadPageSpineShade } from "@/components/children-books/SpreadPageSpineShade";
import { StorySymbol } from "@/components/children-books/ChildrenBookSymbols";
import {
  childrenBookBodyClassName,
  childrenBookOverlayBodyClassName,
} from "@/lib/children-books/childrenBookTypography";
import { childrenBookPagePadding } from "@/lib/children-books/pageMargins";
import {
  isTextOnlyLayout,
  resolvePictureBookTextPosition,
  type PictureBookTextPosition,
} from "@/lib/children-books/spreadLayout";
import type { ChildrenBookPage, ChildrenBookPageLayout } from "@/lib/children-books/storybook";
import { cn } from "@/lib/utils";

const paletteClasses: Record<ChildrenBookPage["palette"], string> = {
  dawn: "from-amber-100 via-rose-50 to-sky-100",
  garden: "from-emerald-100 via-lime-50 to-rose-100",
  royal: "from-violet-100 via-amber-50 to-rose-100",
  starlight: "from-indigo-100 via-sky-50 to-amber-100",
};

type ChildrenBookStoryPageProps = {
  page: ChildrenBookPage;
  layout: ChildrenBookPageLayout;
  side: "left" | "right";
  singlePage: boolean;
  compactChrome?: boolean;
  imageUrl?: string;
  loaded: boolean;
  failed: boolean;
  generating: boolean;
  staticIllustrations?: boolean;
  onLoad: () => void;
  onError: () => void;
  onOpenIllustration: () => void;
};

function StoryTextBlock({
  page,
  textPosition,
  textOnly,
}: {
  page: ChildrenBookPage;
  textPosition: PictureBookTextPosition;
  textOnly: boolean;
}) {
  const isPocket = textPosition === "pocket";
  const onFullArt = isPocket;

  return (
    <div
      className={cn(
        "relative z-10",
        isPocket && "pointer-events-none absolute left-0 top-0 max-w-[min(68%,22rem)]",
        textOnly && "flex min-h-0 flex-1 flex-col justify-center",
        !textOnly && !isPocket && textPosition === "top" && "shrink-0 pt-4 pb-2 sm:pt-5",
        !textOnly && !isPocket && textPosition === "bottom" && "shrink-0 pt-2 pb-4 sm:pb-5",
        isPocket && "p-5 pt-6 sm:p-6 sm:pt-7",
        !isPocket && "px-1 sm:px-2",
      )}
    >
      <p
        className={cn(
          "text-left font-serif",
          onFullArt
            ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9),0_0_18px_rgba(0,0,0,0.45)]"
            : "text-foreground/90",
          onFullArt ? childrenBookOverlayBodyClassName(page.body) : childrenBookBodyClassName(page.body),
        )}
      >
        {page.body}
      </p>
      {textOnly && (
        <p className="mt-5 text-left font-serif text-[0.82rem] italic leading-relaxed text-leather/65 sm:text-[0.88rem]">
          {page.scriptureThread}
        </p>
      )}
      {textOnly && <ChildrenBookGoldFlourish className="mt-8" />}
    </div>
  );
}

function StoryArtBlock({
  page,
  side,
  singlePage,
  textPosition,
  textOnly,
  imageUrl,
  loaded,
  failed,
  generating,
  onLoad,
  onError,
  onOpenIllustration,
  staticIllustrations = false,
}: {
  page: ChildrenBookPage;
  side: "left" | "right";
  singlePage: boolean;
  textPosition: PictureBookTextPosition;
  textOnly: boolean;
  imageUrl?: string;
  loaded: boolean;
  failed: boolean;
  generating: boolean;
  onLoad: () => void;
  onError: () => void;
  onOpenIllustration: () => void;
  staticIllustrations?: boolean;
}) {
  if (textOnly) return null;

  const showImage = Boolean(imageUrl) && !failed;
  const isPocket = textPosition === "pocket";
  const isInsetArt = !isPocket && (textPosition === "top" || textPosition === "bottom");
  const fadeTowardText =
    textPosition === "top" ? "top" : textPosition === "bottom" ? "bottom" : null;
  const artMask = isInsetArt ? buildSoftInsetMask() : buildArtMask(fadeTowardText);

  return (
    <div
      className={cn(
        "relative min-h-0",
        isPocket && "absolute inset-0",
        isInsetArt && "flex min-h-0 flex-1 px-2 pb-3 pt-1 sm:px-3 sm:pb-4",
        !isPocket && !isInsetArt && "flex-1",
      )}
      style={
        singlePage
          ? undefined
          : side === "left"
            ? { marginLeft: "-0.25rem", marginRight: 0 }
            : { marginRight: "-0.25rem", marginLeft: 0 }
      }
    >
      {isPocket && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-br from-black/50 via-black/10 to-transparent"
        />
      )}

      <div
        className={cn(
          "relative min-h-0",
          isPocket && "absolute inset-0",
          isInsetArt && "h-full w-full",
          !isPocket && !isInsetArt && "h-full w-full",
        )}
      >
      {generating && !staticIllustrations && (
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
              "absolute inset-0 h-full w-full object-cover transition-opacity duration-200",
              loaded ? "opacity-100" : "opacity-0",
            )}
            style={{
              objectPosition: isPocket
                ? side === "left"
                  ? "68% center"
                  : "32% center"
                : "center center",
              WebkitMaskImage: artMask,
              maskImage: artMask,
            }}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onLoad={onLoad}
            onError={onError}
          />
          {!loaded && (
            <div
              className={cn(
                "absolute inset-0",
                staticIllustrations
                  ? "animate-pulse bg-[linear-gradient(180deg,#faf6ee_0%,#f3ecdf_100%)]"
                  : cn("bg-gradient-to-br", paletteClasses[page.palette]),
              )}
              style={{
                WebkitMaskImage: artMask,
                maskImage: artMask,
              }}
              aria-hidden
            />
          )}
          {!isInsetArt && loaded && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  side === "left"
                    ? "linear-gradient(90deg, transparent 72%, rgba(250,246,238,0.45) 100%)"
                    : "linear-gradient(270deg, transparent 72%, rgba(250,246,238,0.45) 100%)",
              }}
            />
          )}
        </div>
      ) : staticIllustrations ? (
        <div
          className="absolute inset-0 animate-pulse bg-[linear-gradient(180deg,#faf6ee_0%,#f3ecdf_100%)]"
          aria-hidden
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br p-6 text-center",
            paletteClasses[page.palette],
          )}
          style={{
            WebkitMaskImage: artMask,
            maskImage: artMask,
          }}
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

      </div>
    </div>
  );
}

function buildSoftInsetMask(): string {
  return "radial-gradient(ellipse 90% 86% at 50% 50%, black 42%, rgba(0,0,0,0.7) 58%, transparent 100%)";
}

function buildArtMask(fadeTowardText: "top" | "bottom" | null): string {
  if (fadeTowardText === "top") {
    return "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 6%, black 14%, black 88%, rgba(0,0,0,0.92) 100%)";
  }
  if (fadeTowardText === "bottom") {
    return "linear-gradient(to bottom, black 0%, black 78%, rgba(0,0,0,0.35) 90%, transparent 100%)";
  }
  return "linear-gradient(to bottom, black 0%, black 92%, rgba(0,0,0,0.5) 100%)";
}

export function ChildrenBookStoryPage({
  page,
  layout,
  side,
  singlePage,
  compactChrome,
  imageUrl,
  loaded,
  failed,
  generating,
  staticIllustrations = false,
  onLoad,
  onError,
  onOpenIllustration,
}: ChildrenBookStoryPageProps) {
  const textOnly = isTextOnlyLayout(layout);
  const textPosition = resolvePictureBookTextPosition(layout, side);
  const textFirst = textPosition === "top" || textPosition === "pocket";
  const paddingFace = textPosition === "pocket" ? "art" : "text";

  return (
    <article
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden",
        textPosition !== "pocket" && "bg-[linear-gradient(180deg,#faf6ee_0%,#f3ecdf_100%)]",
      )}
      style={childrenBookPagePadding(side, paddingFace, singlePage, compactChrome)}
    >
      <SpreadPageSpineShade side={side} spread={!singlePage} />
      {textPosition !== "pocket" && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 12%, rgba(255,255,255,0.55), transparent 40%), radial-gradient(circle at 82% 88%, rgba(210,180,130,0.16), transparent 38%)",
          }}
          aria-hidden
        />
      )}

      {textPosition === "pocket" ? (
        <>
          <StoryArtBlock
            page={page}
            side={side}
            singlePage={singlePage}
            textPosition={textPosition}
            textOnly={textOnly}
            imageUrl={imageUrl}
            loaded={loaded}
            failed={failed}
            generating={generating}
            onLoad={onLoad}
            onError={onError}
            onOpenIllustration={onOpenIllustration}
            staticIllustrations={staticIllustrations}
          />
          <StoryTextBlock page={page} textPosition={textPosition} textOnly={textOnly} />
        </>
      ) : (
        <>
          {textFirst && (
            <StoryTextBlock page={page} textPosition={textPosition} textOnly={textOnly} />
          )}
          <StoryArtBlock
            page={page}
            side={side}
            singlePage={singlePage}
            textPosition={textPosition}
            textOnly={textOnly}
            imageUrl={imageUrl}
            loaded={loaded}
            failed={failed}
            generating={generating}
            onLoad={onLoad}
            onError={onError}
            onOpenIllustration={onOpenIllustration}
            staticIllustrations={staticIllustrations}
          />
          {!textFirst && (
            <StoryTextBlock page={page} textPosition={textPosition} textOnly={textOnly} />
          )}
        </>
      )}
    </article>
  );
}
