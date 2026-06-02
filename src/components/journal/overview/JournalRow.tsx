import { BookOpen, ChevronRight } from "lucide-react";
import { Journal } from "@/lib/journal/journals";
import { journalCoverObjectPosition } from "@/lib/journal/covers";

interface Props {
  journal: Journal;
  entryCount: number;
  coverUrl: string | null;
  onOpen: () => void;
}

export default function JournalRow({ journal, entryCount, coverUrl, onOpen }: Props) {
  const hasPhoto = journal.cover_kind === "photo" && !!coverUrl;
  const objectPosition = journalCoverObjectPosition(journal);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="w-full flex items-center gap-4 py-3.5 text-left rounded-lg -mx-2 px-2 hover:bg-muted/40 transition-colors group"
      >
        <div
          className="relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-sm"
          style={
            hasPhoto
              ? undefined
              : {
                  background: `linear-gradient(135deg, hsl(${journal.color}), hsl(${journal.color} / 0.7))`,
                }
          }
        >
          {hasPhoto ? (
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white/90" strokeWidth={1.75} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold truncate text-foreground">{journal.name}</p>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {entryCount} {entryCount === 1 ? "entry" : "entries"}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground flex-shrink-0" />
      </button>
    </li>
  );
}
