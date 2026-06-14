import ArtifactBookReaderContent from "@/components/framework/artifact-detail/ArtifactBookReaderContent";
import ArtifactPdfReaderContent from "@/components/framework/artifact-detail/ArtifactPdfReaderContent";
import { isPdfArtifactKind } from "@/lib/framework/documentArtifact";
import { cn } from "@/lib/utils";
import type { YoutubeChapter } from "@/lib/youtubeChapters";

type Props = {
  kind: string;
  title: string;
  author?: string | null;
  artifactId: string;
  userId?: string | null;
  storagePaths: string[];
  onPdfAttached?: () => void | Promise<void>;
  rawText: string;
  chapters?: YoutubeChapter[];
  /** Mobile tab: defer PDF fetch until Reader tab is active. */
  readerTabActive?: boolean;
  variant?: "mobileTab" | "desktopAside";
  className?: string;
};

export default function ArtifactBookReaderTabPanel({
  kind,
  title,
  author = null,
  artifactId,
  userId = null,
  storagePaths,
  onPdfAttached,
  rawText,
  chapters = [],
  readerTabActive = true,
  variant = "mobileTab",
  className,
}: Props) {
  const usePdf = isPdfArtifactKind(kind);
  const desktopAside = variant === "desktopAside";

  return (
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden bg-background",
        desktopAside && "h-full rounded-xl border border-border/60 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]",
        className,
      )}
      aria-label="Reader"
    >
      {desktopAside ? (
        <header className="shrink-0 border-b border-border/60 px-4 py-3">
          <h2 className="font-display text-base font-semibold tracking-tight text-foreground">Reader</h2>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{title}</p>
        </header>
      ) : null}
      {usePdf ? (
        <ArtifactPdfReaderContent
          title={title}
          artifactId={artifactId}
          userId={userId}
          storagePaths={storagePaths}
          onPdfAttached={onPdfAttached}
          active={readerTabActive}
          showOpenInTab={desktopAside}
          className="min-h-0 flex-1"
        />
      ) : (
        <ArtifactBookReaderContent
          title={title}
          author={author}
          rawText={rawText}
          chapters={chapters}
          className="min-h-0 flex-1"
        />
      )}
    </section>
  );
}
