import {
  useMemo,
  useRef,
  type ChangeEvent,
  type FocusEvent,
  type SyntheticEvent,
} from "react";
import type { JournalVideoRow } from "@/lib/journal/videos";
import { buildJournalCaptionSegments, type JournalCaptionPreview } from "@/lib/journal/journalCaptionPreview";
import { JournalLiveCaptionText } from "./JournalLiveCaptionText";
import JournalEntryVideos from "@/components/journal/JournalEntryVideos";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { useJournalEntryTextareaAutosize } from "@/hooks/useJournalEntryTextareaAutosize";
import { cn } from "@/lib/utils";

function JournalBodyTextSegment({
  slice,
  polishResetKey,
  bodyClassName,
  isLast,
  recording,
  onChange,
  onSelect,
  onFocus,
  onBlur,
}: {
  slice: string;
  polishResetKey?: string;
  bodyClassName?: string;
  isLast: boolean;
  recording: boolean;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSelect: (e: SyntheticEvent<HTMLTextAreaElement>) => void;
  onFocus: (e: FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: FocusEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useJournalEntryTextareaAutosize(ref, slice, true);

  return (
    <PolishedTextarea
      ref={ref}
      polishResetKey={polishResetKey}
      polishFieldKey={`segment:${polishResetKey ?? "body"}`}
      value={slice}
      allowAiPolish={!recording}
      aria-label="Journal entry"
      onChange={onChange}
      onSelect={onSelect}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={isLast && !recording ? "What happened today? Type #tag or @journal name to organize." : undefined}
      className={cn(bodyClassName, !isLast && !recording && "min-h-[4rem]")}
    />
  );
}

type Props = {
  body: string;
  videos: JournalVideoRow[];
  captionPreview?: JournalCaptionPreview | null;
  polishResetKey?: string;
  bodyClassName?: string;
  onBodyChange: (next: string, cursor?: number) => void;
  onRemoveVideo?: (id: string, storagePath: string) => void;
  onRetranscribeVideo?: (video: JournalVideoRow) => void;
  retranscribingVideoId?: string | null;
  onCaretChange?: (offset: number) => void;
  onBodyFocus?: () => void;
  onBodyBlur?: () => void;
};

export default function JournalBodyWithVideos({
  body,
  videos,
  captionPreview,
  polishResetKey,
  bodyClassName,
  onBodyChange,
  onRemoveVideo,
  onRetranscribeVideo,
  retranscribingVideoId = null,
  onCaretChange,
  onBodyFocus,
  onBodyBlur,
}: Props) {
  const segments = useMemo(() => buildJournalCaptionSegments(body, videos, captionPreview), [body, videos, captionPreview]);
  const editorRef = useRef<HTMLDivElement>(null);

  const patchText = (start: number, end: number, nextSlice: string, cursor: number) => {
    const nextCursor = start + cursor;
    onBodyChange(body.slice(0, start) + nextSlice + body.slice(end), nextCursor);
    onCaretChange?.(nextCursor);
  };

  return (
    <div ref={editorRef} className="flex flex-col gap-4">
      {segments.map((seg, i) => {
        if (seg.kind === "caption") return <JournalLiveCaptionText key={seg.caption.id} text={seg.caption.text} className={bodyClassName} />;
        if (seg.kind === "video") {
          return (
            <JournalEntryVideos
              key={seg.video.id}
              videos={[seg.video]}
              onRemove={onRemoveVideo}
              onRetranscribe={onRetranscribeVideo}
              retranscribingId={retranscribingVideoId}
              hideTranscript
            />
          );
        }
        const slice = body.slice(seg.start, seg.end);
        const isLast = i === segments.length - 1;
        return (
          <JournalBodyTextSegment
            // `seg.end` changes on every keystroke in the trailing transcript segment.
            // Keeping it out of the key preserves the textarea, focus, and caret while typing.
            key={`text-${seg.start}`}
            slice={slice}
            polishResetKey={`${polishResetKey ?? "entry"}:${seg.start}`}
            bodyClassName={bodyClassName}
            isLast={isLast}
            recording={Boolean(captionPreview)}
            onChange={(e) => {
              patchText(
                seg.start,
                seg.end,
                e.target.value,
                e.target.selectionStart ?? e.target.value.length,
              );
            }}
            onSelect={(e) => {
              onCaretChange?.(seg.start + (e.currentTarget.selectionStart ?? 0));
            }}
            onFocus={(e) => {
              onCaretChange?.(seg.start + (e.currentTarget.selectionStart ?? e.currentTarget.value.length));
              onBodyFocus?.();
            }}
            onBlur={(e) => {
              const nextFocus = e.relatedTarget instanceof Node ? e.relatedTarget : document.activeElement;
              if (nextFocus instanceof Node && editorRef.current?.contains(nextFocus)) return;
              onBodyBlur?.();
            }}
          />
        );
      })}
    </div>
  );
}
