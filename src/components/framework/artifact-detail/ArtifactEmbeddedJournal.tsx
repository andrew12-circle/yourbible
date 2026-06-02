import { Clock, Loader2, Maximize2, Minimize2, PanelRightClose, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { DictateButton } from "@/components/journal/DictateButton";
import SketchPad from "@/components/journal/SketchPad";
import { JournalSketchInline } from "@/components/journal/JournalSketchInline";
import { useArtifactJournalEditor } from "@/hooks/useArtifactJournalEditor";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import { cn } from "@/lib/utils";

const JOURNAL_HEADER_BG = "#38BDF8";

export type ArtifactEmbeddedJournalProps = {
  userId: string;
  artifactId: string;
  artifactTitle?: string;
  artifactKind?: string;
  getPlaybackSeconds?: () => number | null;
  viewMode: "docked" | "expanded";
  onExpand: () => void;
  onDock: () => void;
  onClose: () => void;
  className?: string;
};

export default function ArtifactEmbeddedJournal({
  userId,
  artifactId,
  artifactTitle,
  artifactKind,
  getPlaybackSeconds,
  viewMode,
  onExpand,
  onDock,
  onClose,
  className,
}: ArtifactEmbeddedJournalProps) {
  const expanded = viewMode === "expanded";
  const {
    title,
    setTitle,
    body,
    setBody,
    saving,
    dateLine,
    textareaRef,
    dictateRef,
    insertTimestamp,
    saveEntry,
    persistDraftNow,
    showTimestamp,
    defaultTitlePlaceholder,
    sketchOpen,
    setSketchOpen,
    previewUrl,
    handleSketchSave,
    clearPendingSketch,
    sketchDraftKey,
  } = useArtifactJournalEditor({
    userId,
    artifactId,
    artifactTitle,
    artifactKind,
    getPlaybackSeconds,
    expanded,
  });

  const handleClose = () => {
    persistDraftNow();
    onClose();
  };

  return (
    <section
      className={cn(
        "flex min-h-0 w-full flex-col border-t border-border/70 bg-card shadow-[0_-4px_24px_-8px_rgba(15,23,42,0.12)] dark:shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.45)]",
        expanded ? "min-h-[min(70dvh,720px)] flex-1" : "max-h-[min(50vh,520px)] shrink-0",
        className,
      )}
      aria-label="Study journal"
    >
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
              aria-label="Expand journal; video becomes picture-in-picture"
              title="Expand journal (video → PiP)"
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

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 py-3 sm:px-4",
          expanded && "scrollbar-hover-thin",
        )}
      >
        <p className="mb-2 shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {dateLine}
        </p>
        {showTimestamp ? (
          <div className="mb-2 flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-border bg-background text-foreground shadow-none hover:bg-muted/80"
              onClick={insertTimestamp}
            >
              <Clock className="mr-1 h-3.5 w-3.5" />
              Insert timestamp
            </Button>
          </div>
        ) : null}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={defaultTitlePlaceholder ? `Title (optional)` : "Title (optional)"}
          className="mb-2 h-auto shrink-0 border-0 bg-transparent px-0.5 py-1 text-lg font-sans font-semibold shadow-none placeholder:text-muted-foreground/55 focus-visible:ring-0"
        />
        <div className="mb-2 flex shrink-0 items-center justify-end gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-muted-foreground hover:text-foreground"
            onClick={() => {
              dictateRef.current?.stop();
              setSketchOpen(true);
            }}
          >
            <PenLine className="mr-1 h-3.5 w-3.5" />
            Handwrite
          </Button>
          <DictateButton
            ref={dictateRef}
            userId={userId}
            size="sm"
            onAppend={(chunk) => setBody((b) => mergeDictatedText(b, chunk))}
          />
        </div>
        {previewUrl ? (
          <JournalSketchInline
            sketches={[{ id: "pending", storage_path: "", url: previewUrl }]}
            className="mb-2 shrink-0"
            onOpenSketch={() => {
              dictateRef.current?.stop();
              setSketchOpen(true);
            }}
            onRemove={clearPendingSketch}
          />
        ) : null}
        <PolishedTextarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write while you watch…"
          className={cn(
            "min-h-[120px] w-full resize-none border-0 bg-transparent px-0.5 py-0 text-base leading-relaxed shadow-none focus-visible:ring-0",
            expanded && "min-h-[200px]",
          )}
        />
        <div className="mt-3 flex shrink-0 justify-end gap-2 border-t border-border/50 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            Close
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={() => void saveEntry()}>
            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            Save entry
          </Button>
        </div>
      </div>

      <SketchPad
        open={sketchOpen}
        onClose={() => setSketchOpen(false)}
        draftKey={sketchDraftKey}
        onSave={handleSketchSave}
        onUnsavedExit={handleSketchSave}
      />
    </section>
  );
}
