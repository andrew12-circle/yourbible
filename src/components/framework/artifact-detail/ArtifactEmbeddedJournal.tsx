import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Clock, Loader2, Maximize2, Minimize2, PanelRightClose, PenLine, Save } from "lucide-react";
import ArtifactJournalTimestampStrip from "@/components/framework/artifact-detail/ArtifactJournalTimestampStrip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { DictateButton } from "@/components/journal/DictateButton";
import ArtifactJournalEntryPageHeader from "@/components/framework/artifact-detail/ArtifactJournalEntryPageHeader";
import SketchPad from "@/components/journal/SketchPad";
import { JournalSketchInline } from "@/components/journal/JournalSketchInline";
import { useArtifactJournalEditor } from "@/hooks/useArtifactJournalEditor";
import { useVisualViewportMetrics } from "@/hooks/useKeyboardInset";
import { isArtifactLayoutDesktop, useArtifactLayoutMode } from "@/hooks/useArtifactLayoutMode";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import { useIsDesktop } from "@/hooks/use-desktop";
import { useHandwrittenPreferredJournal } from "@/hooks/use-reader-layout";
import {
  artifactMobileHandwriteUnderVideo,
  artifactMobileJournalEdgePad,
  artifactMobileTypedJournalPage,
  artifactMobileTypedJournalUnderVideo,
} from "@/lib/framework/artifactLayoutCss";
import type { TranscriptSegment } from "@/lib/transcriptSplit";
import { cn } from "@/lib/utils";

const journalIconBtn =
  "grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground";

const JOURNAL_HEADER_BG = "#38BDF8";

export type ArtifactEmbeddedJournalProps = {
  userId: string;
  artifactId: string;
  artifactTitle?: string;
  artifactKind?: string;
  channel?: string | null;
  channelUrl?: string | null;
  author?: string | null;
  thumbnailUrl?: string | null;
  youTubeVideoId?: string | null;
  providerName?: string | null;
  getPlaybackSeconds?: () => number | null;
  transcriptSegments?: TranscriptSegment[];
  onSeekPlayback?: (seconds: number) => void;
  viewMode: "docked" | "expanded";
  onExpand: () => void;
  onDock: () => void;
  onClose: () => void;
  className?: string;
  /** Mobile journal tab: fill space under pinned video (not a floating panel). */
  fillUnderVideo?: boolean;
};

export default function ArtifactEmbeddedJournal({
  userId,
  artifactId,
  artifactTitle,
  artifactKind,
  channel,
  channelUrl,
  author,
  thumbnailUrl,
  youTubeVideoId,
  providerName,
  getPlaybackSeconds,
  transcriptSegments = [],
  onSeekPlayback,
  viewMode,
  onExpand,
  onDock,
  onClose,
  className,
  fillUnderVideo = false,
}: ArtifactEmbeddedJournalProps) {
  const expanded = viewMode === "expanded";
  const layoutMode = useArtifactLayoutMode();
  const isDesktop = isArtifactLayoutDesktop(layoutMode);
  const isDesktopViewport = useIsDesktop();
  const preferHandwritten = useHandwrittenPreferredJournal();
  const { hash } = useLocation();
  const { keyboardInset: kbInset, offsetTop: vvOffsetTop } = useVisualViewportMetrics();
  const inlineHandwrite = !isDesktop;
  const dismissedHandwriteRef = useRef(false);
  const {
    title,
    setTitle,
    editorNotes,
    setEditorNotes,
    saving,
    dateLine,
    textareaRef,
    dictateRef,
    insertTimestamp,
    seekToTimestamp,
    timestampMarkers,
    saveEntry,
    persistDraftNow,
    showTimestamp,
    defaultTitlePlaceholder,
    journalDisplayTitle,
    showJournalPageHeader,
    sketchOpen,
    setSketchOpen,
    previewUrl,
    handleSketchSave,
    clearPendingSketch,
    sketchDraftKey,
    savedSketchUrl,
    handleSketchAutosave,
    startNewHandwritePage,
  } = useArtifactJournalEditor({
    userId,
    artifactId,
    artifactTitle,
    artifactKind,
    channel,
    channelUrl,
    author,
    thumbnailUrl,
    youTubeVideoId,
    providerName,
    getPlaybackSeconds,
    transcriptSegments,
    onSeekPlayback,
    expanded,
  });

  const pageHeaderProps = {
    channel,
    channelUrl,
    author,
    thumbnailUrl,
    youTubeVideoId,
    providerName,
    title,
    onTitleChange: setTitle,
    titlePlaceholder: defaultTitlePlaceholder || "Title",
  };

  const handleClose = () => {
    persistDraftNow();
    onClose();
  };

  const enterHandwrite = () => {
    dictateRef.current?.stop();
    dismissedHandwriteRef.current = false;
    setSketchOpen(true);
  };

  const exitHandwriteToTyping = () => {
    dismissedHandwriteRef.current = true;
    setSketchOpen(false);
  };

  useEffect(() => {
    if (fillUnderVideo) {
      if (hash !== "#journal") {
        dismissedHandwriteRef.current = false;
        return;
      }
      if (!inlineHandwrite || !preferHandwritten || dismissedHandwriteRef.current) return;
      setSketchOpen(true);
      return;
    }
    if (!inlineHandwrite || !preferHandwritten || dismissedHandwriteRef.current) return;
    setSketchOpen(true);
  }, [
    artifactId,
    fillUnderVideo,
    hash,
    inlineHandwrite,
    preferHandwritten,
    setSketchOpen,
  ]);

  const handwriteActive = sketchOpen && inlineHandwrite;
  const handwriteUnderVideo = handwriteActive && fillUnderVideo;

  const timestampMarkersStrip =
    showTimestamp && timestampMarkers.length > 0 ? (
      <ArtifactJournalTimestampStrip
        markers={timestampMarkers}
        onSeek={seekToTimestamp}
        variant={handwriteActive || fillUnderVideo ? "notebook" : "default"}
      />
    ) : null;

  const timestampHandwriteStrip = timestampMarkersStrip;

  const typedJournalTitleActions = (
    <>
      {showTimestamp ? (
        <button
          type="button"
          onClick={insertTimestamp}
          className={journalIconBtn}
          title="Timestamp"
          aria-label="Timestamp"
        >
          <Clock className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      <DictateButton
        ref={dictateRef}
        userId={userId}
        size="sm"
        onAppend={(chunk) => setEditorNotes((b) => mergeDictatedText(b, chunk))}
      />
      <button
        type="button"
        onClick={enterHandwrite}
        className={journalIconBtn}
        title="Handwrite"
        aria-label="Handwrite"
      >
        <PenLine className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => void saveEntry()}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
        title="Save entry"
        aria-label="Save entry"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Save className="h-4 w-4" aria-hidden />
        )}
      </button>
    </>
  );

  return (
    <section
      className={cn(
        "flex min-h-0 w-full flex-col",
        handwriteUnderVideo
          ? artifactMobileHandwriteUnderVideo
          : fillUnderVideo
            ? null
            : "border-t border-border/70 bg-card shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.12)] dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.45)]",
        fillUnderVideo && !handwriteUnderVideo
          ? artifactMobileTypedJournalUnderVideo
          : handwriteActive && !fillUnderVideo
            ? "min-h-[min(52dvh,560px)] flex-1"
            : expanded
              ? "min-h-[min(70dvh,720px)] flex-1"
              : "max-h-[min(50vh,520px)] shrink-0",
        className,
      )}
      style={
        fillUnderVideo && kbInset > 0
          ? {
              bottom: `calc(${kbInset}px + var(--artifact-mobile-dock-h, 5.5rem) + env(safe-area-inset-bottom, 0px))`,
            }
          : undefined
      }
      aria-label="Study journal"
    >
      {!handwriteActive && !fillUnderVideo ? (
        <header
          className="flex shrink-0 items-center gap-2 px-3 py-2 text-white sm:px-4"
          style={{ backgroundColor: JOURNAL_HEADER_BG }}
        >
          <span className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
            Journal
            {artifactTitle ? (
              <span className="ml-1.5 font-normal text-white/85">· {artifactTitle}</span>
            ) : null}
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            {expanded ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
                aria-label="Dock journal under video"
                title="Dock journal under video"
                onClick={() => {
                  persistDraftNow();
                  onDock();
                }}
              >
                <Minimize2 className="h-4 w-4" aria-hidden />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
                aria-label={isDesktopViewport ? "Expand journal; video becomes picture-in-picture" : "Expand journal"}
                title={isDesktopViewport ? "Expand journal (video → PiP)" : "Expand journal"}
                onClick={() => {
                  persistDraftNow();
                  onExpand();
                }}
              >
                <Maximize2 className="h-4 w-4" aria-hidden />
              </Button>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
              aria-label="Close journal"
              title="Close journal"
              onClick={handleClose}
            >
              <PanelRightClose className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </header>
      ) : null}

      {handwriteActive ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <SketchPad
            layout="inline"
            open
            fullBleed={fillUnderVideo}
            inlineTitle={journalDisplayTitle}
            journalPageHeader={
              showJournalPageHeader ? (
                <ArtifactJournalEntryPageHeader {...pageHeaderProps} variant="notebook" />
              ) : null
            }
            onClose={exitHandwriteToTyping}
            draftKey={sketchDraftKey}
            clearDraftOnSave={false}
            backgroundImageUrl={savedSketchUrl}
            onAutosave={handleSketchAutosave}
            onSave={handleSketchSave}
            showNewPage
            onNewPage={startNewHandwritePage}
            journalTimestampStrip={timestampHandwriteStrip}
            onInsertTimestamp={showTimestamp ? insertTimestamp : undefined}
          />
        </div>
      ) : fillUnderVideo ? (
        <div className={artifactMobileTypedJournalPage}>
          <ArtifactJournalEntryPageHeader
            {...pageHeaderProps}
            variant="notebook"
            className="sticky z-10 shrink-0"
            style={vvOffsetTop > 0 ? { top: vvOffsetTop } : { top: 0 }}
            titleActions={typedJournalTitleActions}
          />
          {timestampMarkersStrip ? (
            <div className="w-full shrink-0">{timestampMarkersStrip}</div>
          ) : null}
          <PolishedTextarea
            ref={textareaRef}
            value={editorNotes}
            onChange={(e) => setEditorNotes(e.target.value)}
            placeholder="Write while you watch…"
            wrapperClassName="flex min-h-[min(40dvh,520px)] w-full flex-1 flex-col"
            className={cn(
              "min-h-[min(40dvh,520px)] w-full flex-1 resize-none border-0 bg-transparent py-2",
              artifactMobileJournalEdgePad,
              "text-base leading-relaxed shadow-none focus-visible:ring-0",
            )}
            style={
              kbInset > 0
                ? { paddingBottom: `calc(${kbInset}px + 0.5rem)` }
                : undefined
            }
          />
        </div>
      ) : (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overscroll-contain overflow-y-auto px-3 py-3 sm:px-4",
            expanded && "scrollbar-hover-thin",
          )}
        >
          <div>
          {showJournalPageHeader ? (
            <ArtifactJournalEntryPageHeader
              {...pageHeaderProps}
              variant="sheet"
              className="mb-2 shrink-0"
            />
          ) : (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitlePlaceholder || "Title (optional)"}
              className="mb-2 h-auto shrink-0 border-0 bg-transparent px-0.5 py-1 text-lg font-sans font-semibold shadow-none placeholder:text-muted-foreground/55 focus-visible:ring-0"
            />
          )}
          <p className="mb-2 shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {dateLine}
          </p>
          {showTimestamp ? (
            <div className="mb-2 w-full shrink-0">
              {timestampMarkers.length > 0 ? (
                <ArtifactJournalTimestampStrip
                  markers={timestampMarkers}
                  onSeek={seekToTimestamp}
                />
              ) : null}
            </div>
          ) : null}
          <div className="mb-2 flex w-full shrink-0 items-center justify-end gap-1">
            {showTimestamp ? (
              <button
                type="button"
                onClick={insertTimestamp}
                className={journalIconBtn}
                title="Timestamp"
                aria-label="Timestamp"
              >
                <Clock className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
            <button
              type="button"
              onClick={enterHandwrite}
              className={journalIconBtn}
              title="Handwrite"
              aria-label="Handwrite"
            >
              <PenLine className="h-4 w-4" aria-hidden />
            </button>
            <DictateButton
              ref={dictateRef}
              userId={userId}
              size="sm"
              onAppend={(chunk) => setEditorNotes((b) => mergeDictatedText(b, chunk))}
            />
          </div>
          {previewUrl ? (
            <JournalSketchInline
              sketches={[{ id: "pending", storage_path: "", url: previewUrl }]}
              className="mb-2 shrink-0"
              onOpenSketch={enterHandwrite}
              onRemove={clearPendingSketch}
            />
          ) : null}
        <PolishedTextarea
          ref={textareaRef}
          value={editorNotes}
          onChange={(e) => setEditorNotes(e.target.value)}
          placeholder="Write while you watch…"
          className={cn(
            "min-h-[120px] w-full resize-none border-0 bg-transparent px-0.5 py-0 text-base leading-relaxed shadow-none focus-visible:ring-0",
            expanded && "min-h-[200px]",
          )}
        />
          <div className="mt-3 flex w-full shrink-0 justify-end gap-2 border-t border-border/50 pt-3">
            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
              Close
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={() => void saveEntry()}>
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              Save entry
            </Button>
          </div>
          </div>
        </div>
      )}

      {!inlineHandwrite ? (
        <SketchPad
          open={sketchOpen}
          onClose={() => setSketchOpen(false)}
          draftKey={sketchDraftKey}
          onSave={handleSketchSave}
          onUnsavedExit={handleSketchSave}
        />
      ) : null}
    </section>
  );
}
