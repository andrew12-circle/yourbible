import { Ear, Trash2, X } from "lucide-react";
import { JournalSketchInline } from "@/components/journal/JournalSketchInline";
import InlineJournalChatTranscript from "@/components/journal/InlineJournalChatTranscript";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { Label } from "@/components/ui/label";
import { ENTRY_KIND_META } from "@/lib/journal/entryKinds";
import { LISTENING_SECTIONS, type ListeningSectionKey, type ListeningSections } from "@/lib/journal/listeningEntry";
import type { InlineChatTurn } from "@/lib/journal/inlineJournalChat";
import { useRef, type RefObject } from "react";
import { useJournalEntryTextareaAutosize } from "@/hooks/useJournalEntryTextareaAutosize";

type PhotoItem = { id: string; storage_path: string; url?: string };

interface NewJournalEntryBodyEditorProps {
  editId?: string;
  isListening: boolean;
  inlineChatMode: boolean;
  body: string;
  setBody: (value: string) => void;
  bodyPlaceholder: string;
  listeningSections: ListeningSections;
  setListeningSection: (key: ListeningSectionKey, value: string) => void;
  chatScrollRef: RefObject<HTMLDivElement | null>;
  chatBottomRef: RefObject<HTMLDivElement | null>;
  chatTurns: InlineChatTurn[];
  aiBusy: boolean;
  dictInterim: string;
  existingSketches: PhotoItem[];
  existingAttachments: PhotoItem[];
  pendingSketches: File[];
  pendingAttachments: File[];
  onOpenSketch: () => void;
  onRemoveExistingPhoto: (photoId: string, storage_path: string) => void;
  onRemovePendingFile: (file: File) => void;
}

export function NewJournalEntryBodyEditor({
  editId,
  isListening,
  inlineChatMode,
  body,
  setBody,
  bodyPlaceholder,
  listeningSections,
  setListeningSection,
  chatScrollRef,
  chatBottomRef,
  chatTurns,
  aiBusy,
  dictInterim,
  existingSketches,
  existingAttachments,
  pendingSketches,
  pendingAttachments,
  onOpenSketch,
  onRemoveExistingPhoto,
  onRemovePendingFile,
}: NewJournalEntryBodyEditorProps) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  useJournalEntryTextareaAutosize(bodyRef, body);

  if (isListening) {
    return (
      <section
        className="mt-2 rounded-xl border border-amber-200/70 bg-amber-50/70 p-3 dark:border-amber-700/40 dark:bg-amber-900/20"
        aria-label="Listening entry"
      >
        <div className="mb-3 flex items-start gap-3">
          <div className="rounded-full border border-amber-300 bg-amber-100/80 p-2 text-amber-700 dark:border-amber-600 dark:bg-amber-800/40 dark:text-amber-200">
            <Ear className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium leading-tight">Listening — heard from God</div>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              {ENTRY_KIND_META.listening.shortHint}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {LISTENING_SECTIONS.map((section) => (
            <div key={section.key} className="rounded-lg border border-border bg-background/80 p-3">
              <Label
                htmlFor={`listening-${section.key}`}
                className="text-[11px] uppercase tracking-wider text-muted-foreground"
              >
                {section.label}
              </Label>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/85">{section.hint}</p>
              <PolishedTextarea
                polishResetKey={section.key}
                id={`listening-${section.key}`}
                value={listeningSections[section.key]}
                onChange={(e) => setListeningSection(section.key, e.target.value)}
                rows={section.rows}
                placeholder={section.placeholder}
                className="mt-2 font-sans text-[15px] leading-relaxed"
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (inlineChatMode) {
    return (
      <InlineJournalChatTranscript
        scrollRef={chatScrollRef}
        bottomRef={chatBottomRef}
        turns={chatTurns}
        aiBusy={aiBusy}
        seedUserText={body}
        dictInterim={dictInterim}
        className="flex-1 -mx-3 sm:-mx-5 px-3 sm:px-5 overflow-y-auto"
      />
    );
  }

  return (
    <>
      <PolishedTextarea
        ref={bodyRef}
        polishResetKey={editId ?? "journal-new"}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={bodyPlaceholder}
        className="mt-1 min-h-[40dvh] resize-none overflow-hidden border-0 bg-transparent px-0 py-2 font-sans text-[16px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
      />
      {dictInterim.trim() ? (
        <p className="text-sm italic leading-relaxed text-muted-foreground/80" aria-live="polite">
          {dictInterim}
        </p>
      ) : null}
      {existingSketches.length > 0 ? (
        <JournalSketchInline
          sketches={existingSketches}
          className="mt-4"
          onOpenSketch={onOpenSketch}
          onRemove={onRemoveExistingPhoto}
        />
      ) : null}
      {pendingSketches.length > 0 ? (
        <div className="mt-4 space-y-3">
          {pendingSketches.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="group relative overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm"
            >
              <button type="button" onClick={onOpenSketch} className="block w-full">
                <img
                  src={URL.createObjectURL(f)}
                  alt="Handwritten journal note"
                  className="w-full max-h-[min(72vh,640px)] object-contain bg-white"
                />
              </button>
              <button
                type="button"
                onClick={() => onRemovePendingFile(f)}
                className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white"
                aria-label="Remove handwritten note"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {(existingAttachments.length > 0 || pendingAttachments.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {existingAttachments.map((p) => (
            <div key={p.id} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
              {p.url ? (
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
              <button
                type="button"
                onClick={() => onRemoveExistingPhoto(p.id, p.storage_path)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {pendingAttachments.map((f, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
              <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemovePendingFile(f)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
