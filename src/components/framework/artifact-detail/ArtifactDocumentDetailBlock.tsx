import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";
import ArtifactBookCoverStage from "@/components/framework/artifact-detail/ArtifactBookCoverStage";
import ArtifactBookReaderDialog from "@/components/framework/artifact-detail/ArtifactBookReaderDialog";
import ArtifactPdfReaderDialog from "@/components/framework/artifact-detail/ArtifactPdfReaderDialog";
import {
  artifactCard,
  artifactDesktopVideoCard,
  artifactScrollMt,
  artifactVideoRadius,
} from "@/lib/framework/artifactSurfaces";
import { isPdfArtifactKind, resolvePdfStoragePaths } from "@/lib/framework/documentArtifact";
import { cn } from "@/lib/utils";
import type { YoutubeChapter } from "@/lib/youtubeChapters";

export type ArtifactDocumentDetailBlockHandle = {
  openReader: (chapterIndex?: number) => void;
};

type Props = {
  artifactId: string;
  kind: string;
  title: string;
  author?: string | null;
  pageCount?: number | null;
  thumbnailUrl?: string | null;
  pdfStoragePath?: string | null;
  pdfStoragePaths?: string[];
  artifactMetadata?: Record<string, unknown> | null;
  userId?: string | null;
  onPdfAttached?: () => void | Promise<void>;
  rawText: string;
  chapters?: YoutubeChapter[];
  stickyMode?: boolean;
  heroEmbed?: boolean;
};

const ArtifactDocumentDetailBlock = forwardRef<ArtifactDocumentDetailBlockHandle, Props>(
  function ArtifactDocumentDetailBlock(
    {
      artifactId,
      kind,
      title,
      author = null,
      pageCount = null,
      thumbnailUrl = null,
      pdfStoragePath = null,
      pdfStoragePaths = [],
      artifactMetadata = null,
      userId = null,
      onPdfAttached,
      rawText,
      chapters = [],
      stickyMode = false,
      heroEmbed = false,
    },
    ref,
  ) {
    const [readerOpen, setReaderOpen] = useState(false);
    const [initialChapterIndex, setInitialChapterIndex] = useState<number | null>(null);
    const usePdfReader = isPdfArtifactKind(kind);

    const openReader = useCallback((chapterIndex?: number) => {
      setInitialChapterIndex(chapterIndex ?? null);
      setReaderOpen(true);
    }, []);

    useImperativeHandle(ref, () => ({ openReader }), [openReader]);

    const resolvedPdfPaths = useMemo(() => {
      if (pdfStoragePaths.length > 0) return pdfStoragePaths;
      if (pdfStoragePath) return [pdfStoragePath];
      return resolvePdfStoragePaths(userId, artifactId, artifactMetadata);
    }, [artifactId, artifactMetadata, pdfStoragePath, pdfStoragePaths, userId]);

    const cover = (
      <ArtifactBookCoverStage
        artifactId={artifactId}
        title={title}
        author={author}
        pageCount={pageCount}
        thumbnailUrl={thumbnailUrl}
        artifactMetadata={artifactMetadata}
        pdfStoragePath={pdfStoragePath}
        pdfStoragePaths={resolvedPdfPaths}
        onOpenReader={() => openReader()}
        readLabel={usePdfReader ? "Read PDF" : "Read book"}
        openHint={usePdfReader ? "Tap the cover to open the PDF" : undefined}
        variant={heroEmbed ? "hero" : stickyMode ? "mobilePinned" : "default"}
      />
    );

    const reader = usePdfReader ? (
      <ArtifactPdfReaderDialog
        open={readerOpen}
        onOpenChange={setReaderOpen}
        title={title}
        author={author}
        artifactId={artifactId}
        userId={userId}
        storagePaths={resolvedPdfPaths}
        onPdfAttached={onPdfAttached}
      />
    ) : (
      <ArtifactBookReaderDialog
        open={readerOpen}
        onOpenChange={setReaderOpen}
        title={title}
        author={author}
        rawText={rawText}
        chapters={chapters}
        initialChapterIndex={initialChapterIndex}
      />
    );

    if (heroEmbed) {
      return (
        <>
          {cover}
          {reader}
        </>
      );
    }

    if (stickyMode) {
      return (
        <>
          <div
            id="video"
            className={cn(
              "sticky z-[29] w-full shrink-0 bg-background/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-sm",
            )}
            style={{ top: "var(--artifact-header-h, 0px)" }}
          >
            {cover}
          </div>
          {reader}
        </>
      );
    }

    return (
      <>
        <section id="video" className={cn(artifactCard, artifactScrollMt, "mb-0 p-3 sm:p-4 lg:mb-0 lg:p-3")}>
          <div className={cn(artifactDesktopVideoCard, artifactVideoRadius, "bg-muted/20")}>{cover}</div>
        </section>
        {reader}
      </>
    );
  },
);

export default ArtifactDocumentDetailBlock;

export function chapterIndexForStartSeconds(chapters: YoutubeChapter[], startSeconds: number): number {
  return chapters.findIndex((c) => c.start_seconds === startSeconds);
}
