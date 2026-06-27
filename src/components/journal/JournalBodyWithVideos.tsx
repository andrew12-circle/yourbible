import { useMemo } from "react";
import type { JournalVideoRow } from "@/lib/journal/videos";
import { buildJournalBodySegments } from "@/lib/journal/journalVideoBody";
import JournalEntryVideos from "@/components/journal/JournalEntryVideos";
import { PolishedTextarea } from "@/components/writing/PolishedTextarea";
import { cn } from "@/lib/utils";

type Props = {
  body: string;
  videos: JournalVideoRow[];
  polishResetKey?: string;
  bodyClassName?: string;
  onBodyChange: (next: string) => void;
  onRemoveVideo?: (id: string, storagePath: string) => void;
  onRetranscribeVideo?: (video: JournalVideoRow) => void;
  retranscribingVideoId?: string | null;
  onCaretChange?: (offset: number) => void;
};

export default function JournalBodyWithVideos({
  body,
  videos,
  polishResetKey,
  bodyClassName,
  onBodyChange,
  onRemoveVideo,
  onRetranscribeVideo,
  retranscribingVideoId = null,
  onCaretChange,
}: Props) {
  const segments = useMemo(() => buildJournalBodySegments(body, videos), [body, videos]);

  const patchText = (start: number, end: number, nextSlice: string) => {
    onBodyChange(body.slice(0, start) + nextSlice + body.slice(end));
  };

  return (
    <div className="flex flex-col gap-4">
      {segments.map((seg, i) => {
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
          <PolishedTextarea
            key={`text-${seg.start}-${seg.end}`}
            polishResetKey={polishResetKey}
            value={slice}
            onChange={(e) => {
              patchText(seg.start, seg.end, e.target.value);
              onCaretChange?.(seg.start + (e.target.selectionStart ?? e.target.value.length));
            }}
            onSelect={(e) => {
              onCaretChange?.(seg.start + (e.currentTarget.selectionStart ?? 0));
            }}
            onFocus={(e) => {
              onCaretChange?.(seg.start + (e.currentTarget.selectionStart ?? e.currentTarget.value.length));
            }}
            placeholder={isLast ? "What happened today? Type #tag or @journal name to organize." : undefined}
            className={cn(bodyClassName, !isLast && "min-h-[4rem]")}
          />
        );
      })}
    </div>
  );
}
