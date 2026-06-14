import { BookOpen, Loader2 } from "lucide-react";
import { GeneratedCover } from "@/pages/framework/artifacts/GeneratedCover";
import { useArtifactDocumentCover } from "@/hooks/useArtifactDocumentCover";
import { artifactVideoRadius } from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";

type Props = {
  artifactId: string;
  title: string;
  author?: string | null;
  pageCount?: number | null;
  thumbnailUrl?: string | null;
  artifactMetadata?: Record<string, unknown> | null;
  pdfStoragePath?: string | null;
  pdfStoragePaths?: string[];
  onOpenReader: () => void;
  readLabel?: string;
  openHint?: string;
  /** Desktop cinematic hero — cover fills the slot like inline video. */
  variant?: "default" | "hero" | "mobilePinned";
};

export default function ArtifactBookCoverStage({
  artifactId,
  title,
  author = null,
  pageCount = null,
  thumbnailUrl = null,
  artifactMetadata = null,
  pdfStoragePath = null,
  pdfStoragePaths = [],
  onOpenReader,
  readLabel = "Read book",
  openHint,
  variant = "default",
}: Props) {
  const hero = variant === "hero";
  const pinned = variant === "mobilePinned";

  const { coverUrl, loading, fromPdf } = useArtifactDocumentCover({
    artifactId,
    metadata: {
      ...(artifactMetadata ?? {}),
      ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
    },
    pdfStoragePath: pdfStoragePaths[0] ?? pdfStoragePath,
    pdfStoragePaths: pdfStoragePaths.length > 0 ? pdfStoragePaths : pdfStoragePath ? [pdfStoragePath] : [],
  });

  const hasRealCover = Boolean(coverUrl);

  const coverInner = loading && !hasRealCover ? (
    <div className="flex h-full w-full items-center justify-center bg-muted/40">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
    </div>
  ) : hasRealCover ? (
    <img src={coverUrl!} alt="" className="h-full w-full object-cover" draggable={false} />
  ) : (
    <GeneratedCover artifactId={artifactId} title={title} variant="document" className="rounded-[inherit]" />
  );

  const metaLine = [author, pageCount != null ? `${pageCount} pages` : null].filter(Boolean).join(" · ");

  return (
    <button
      type="button"
      onClick={onOpenReader}
      aria-label={`Read ${title}`}
      className={cn(
        "group relative block w-full overflow-hidden text-left transition-transform duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        !hero && !pinned && "active:scale-[0.99]",
      )}
    >
      <div
        className={cn(
          hero
            ? "flex min-h-[min(52vh,520px)] w-full items-center justify-center bg-gradient-to-b from-muted/40 to-muted/10 px-6 py-10 sm:px-10"
            : pinned
              ? "mx-auto flex max-w-[220px] justify-center py-2"
              : "mx-auto flex max-w-[280px] justify-center p-4 sm:max-w-[320px]",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-black shadow-[0_24px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-black/10",
            artifactVideoRadius,
            hero ? "aspect-[2/3] h-[min(46vh,440px)] w-auto" : "aspect-[2/3] w-full max-w-[240px]",
            "transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_28px_56px_-14px_rgba(0,0,0,0.6)]",
          )}
        >
          {coverInner}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent",
              fromPdf ? "opacity-40" : "opacity-90",
            )}
            aria-hidden
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-0 z-[2] p-4 text-white",
              fromPdf && "opacity-0",
            )}
          >
            <p className="line-clamp-3 font-display text-lg font-semibold leading-snug tracking-tight drop-shadow-md">
              {title}
            </p>
            {metaLine ? <p className="mt-1 line-clamp-1 text-xs text-white/80">{metaLine}</p> : null}
          </div>
          <div className="pointer-events-none absolute inset-0 z-[3] flex flex-col items-center justify-center gap-2 bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100 group-focus-visible:bg-black/35 group-focus-visible:opacity-100">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-foreground shadow-lg">
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
              {readLabel}
            </span>
          </div>
        </div>
      </div>
      {!hero && !pinned ? (
        <p className="pb-1 text-center text-xs text-muted-foreground">
          {openHint ?? "Tap the cover to open the reader"}
        </p>
      ) : null}
    </button>
  );
}
