import { BookOpen, Loader2 } from "lucide-react";
import { useCoverImageUrl, useGenerateCoverIllustration } from "@/hooks/useCoverImageUrl";
import { usePageImageLoaded } from "@/hooks/usePageImageUrl";
import type { ChildrenBook } from "@/lib/children-books/storybook";
import { cn } from "@/lib/utils";

type ChildrenBookCoverSpreadProps = {
  book: ChildrenBook;
  opening: boolean;
  onOpen: () => void;
};

export function ChildrenBookCoverSpread({ book, opening, onOpen }: ChildrenBookCoverSpreadProps) {
  const autoGenerate = !book.useDefaultCoverPath;
  const { imageUrl, generating } = useGenerateCoverIllustration(book, { auto: autoGenerate });
  const { loaded, failed, onLoad, onError } = usePageImageLoaded(imageUrl);
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <div className="flex h-full min-h-0 items-center justify-center px-2 py-2 sm:px-4 sm:py-3">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${book.title}`}
        className={cn(
          "group/cover relative aspect-[3/4] h-full max-h-full w-auto max-w-full overflow-hidden rounded-r-lg rounded-l-sm text-left shadow-2xl",
          "transition duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-fabric",
          "before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-3 before:bg-black/20 sm:before:w-4",
          "after:absolute after:inset-y-2 after:left-1.5 after:z-10 after:w-px after:bg-white/20",
          opening
            ? "pointer-events-none scale-[1.02] opacity-0"
            : "hover:-translate-y-1 hover:shadow-[0_28px_60px_-12px_rgba(0,0,0,0.35)] active:scale-[0.99]",
        )}
        style={{ background: book.coverGradient }}
      >
        {generating && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-black/30 backdrop-blur-[1px]">
            <Loader2 className="h-8 w-8 animate-spin text-white drop-shadow" aria-hidden />
            <span className="text-xs font-medium text-white drop-shadow">Painting cover…</span>
          </div>
        )}

        {showImage ? (
          <>
            <img
              src={imageUrl}
              alt={book.coverImageAlt ?? `${book.title} cover`}
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
                loaded ? "opacity-100" : "opacity-0",
              )}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onLoad={onLoad}
              onError={onError}
            />
            {!loaded && (
              <div
                className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20"
                aria-hidden
              />
            )}
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/25" />
        )}

        <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />

        <div className="relative z-20 flex h-full flex-col justify-between p-6 sm:p-8 lg:p-10">
          <BookOpen className="h-7 w-7 text-white/90 drop-shadow sm:h-8 sm:w-8" aria-hidden />

          <div>
            <h2 className="font-display text-xl font-semibold leading-tight text-white drop-shadow sm:text-2xl lg:text-3xl">
              {book.title}
            </h2>
            <p className="mt-2 text-sm text-white/85 sm:text-base">{book.ageRange}</p>
            <p
              className={cn(
                "mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm",
                "transition group-hover/cover:bg-white/25 sm:text-sm",
              )}
            >
              Tap to open
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}

export function ChildrenBookCoverThumbnail({
  book,
  className,
}: {
  book: ChildrenBook;
  className?: string;
}) {
  const imageUrl = useCoverImageUrl(book);
  const { loaded, failed, onLoad, onError } = usePageImageLoaded(imageUrl);
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-r-md rounded-l-sm",
        "before:absolute before:inset-y-0 before:left-0 before:z-10 before:w-2 before:bg-black/15",
        "after:absolute after:inset-y-1 after:left-1 after:z-10 after:w-px after:bg-white/25",
        className,
      )}
      style={{ background: book.coverGradient }}
    >
      {showImage && (
        <img
          src={imageUrl}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={onLoad}
          onError={onError}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25" />
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
    </div>
  );
}
