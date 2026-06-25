import { useMemo } from "react";
import type { JournalVideoRow } from "@/lib/journal/videos";
import { buildJournalBodySegments } from "@/lib/journal/journalVideoBody";
import JournalEntryVideos from "@/components/journal/JournalEntryVideos";
import { cn } from "@/lib/utils";

type Props = {
  body: string;
  videos: JournalVideoRow[];
  className?: string;
  onEdit?: () => void;
  editable?: boolean;
};

export default function JournalBodyReadWithVideos({ body, videos, className, onEdit, editable }: Props) {
  const segments = useMemo(() => buildJournalBodySegments(body, videos), [body, videos]);

  return (
    <div className={cn("space-y-4", className)}>
      {segments.map((seg, i) => {
        if (seg.kind === "video") {
          return <JournalEntryVideos key={seg.video.id} videos={[seg.video]} hideTranscript />;
        }
        const slice = body.slice(seg.start, seg.end);
        if (!slice.trim()) return null;
        const text = (
          <p className="font-sans text-[16px] leading-relaxed whitespace-pre-wrap">{slice}</p>
        );
        if (editable && onEdit) {
          return (
            <button key={`text-${seg.start}-${seg.end}`} type="button" onClick={onEdit} className="block w-full text-left">
              {text}
            </button>
          );
        }
        return <div key={`text-${seg.start}-${seg.end}`}>{text}</div>;
      })}
    </div>
  );
}
