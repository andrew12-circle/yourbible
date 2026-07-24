import { useRef } from "react";
import type { VisionBoardItemRow } from "@/lib/vision-board/api";
import {
  normalizeNoteColor,
  noteColorCss,
  type NoteColor,
} from "@/lib/vision-board/boardGeometry";
import { cn } from "@/lib/utils";

type Props = {
  item: VisionBoardItemRow;
  selected: boolean;
  photoUrl?: string | null;
  onSelect: (id: string) => void;
  onPointerDownMove: (e: React.PointerEvent, id: string) => void;
  onPointerDownResize: (e: React.PointerEvent, id: string) => void;
  onPointerDownRotate: (e: React.PointerEvent, id: string) => void;
  onNoteTextChange: (id: string, text: string) => void;
  onNoteColorChange: (id: string, color: NoteColor) => void;
};

function PushPin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 32" className={className} aria-hidden>
      <ellipse cx="12" cy="7" rx="7" ry="6" fill="#c0392b" stroke="#7b1e18" strokeWidth="1" />
      <ellipse cx="10" cy="5" rx="2.5" ry="1.8" fill="rgba(255,255,255,0.35)" />
      <rect x="11" y="12" width="2" height="16" rx="1" fill="#555" />
      <circle cx="12" cy="28" r="1.5" fill="#333" />
    </svg>
  );
}

export function VisionBoardItem({
  item,
  selected,
  photoUrl,
  onSelect,
  onPointerDownMove,
  onPointerDownResize,
  onPointerDownRotate,
  onNoteTextChange,
  onNoteColorChange,
}: Props) {
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const isPin = item.type === "pin";

  return (
    <div
      role="button"
      tabIndex={0}
      data-item-id={item.id}
      className={cn(
        "absolute touch-none select-none outline-none",
        selected && "z-[9999]",
      )}
      style={{
        left: item.x,
        top: item.y,
        width: item.width,
        height: item.height,
        transform: `rotate(${item.rotation}deg)`,
        zIndex: selected ? 9999 : item.z_index,
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-handle]")) return;
        if ((e.target as HTMLElement).closest("textarea,button,input")) return;
        onSelect(item.id);
        onPointerDownMove(e, item.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item.id);
        }
      }}
    >
      {item.type === "photo" && (
        <div className="vision-board-photo relative h-full w-full overflow-hidden">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">
              Photo
            </div>
          )}
          <PushPin className="pointer-events-none absolute left-1/2 top-0 h-7 w-5 -translate-x-1/2 -translate-y-1 drop-shadow" />
        </div>
      )}

      {item.type === "note" && (
        <div
          className="vision-board-note relative flex h-full w-full flex-col p-2 pt-5"
          style={{ backgroundColor: noteColorCss(normalizeNoteColor(item.note_color)) }}
        >
          <PushPin className="pointer-events-none absolute left-1/2 top-0 h-6 w-4 -translate-x-1/2 -translate-y-1 drop-shadow" />
          <textarea
            ref={noteRef}
            value={item.text ?? ""}
            onChange={(e) => onNoteTextChange(item.id, e.target.value)}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelect(item.id);
            }}
            placeholder="Write a saying…"
            className="h-full w-full resize-none bg-transparent text-sm leading-snug text-foreground/90 outline-none placeholder:text-foreground/40"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          />
          {selected && (
            <div className="mt-1 flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
              {(["yellow", "pink", "mint", "blue", "cream"] as NoteColor[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`${c} note`}
                  className={cn(
                    "h-3.5 w-3.5 rounded-full border border-black/20",
                    normalizeNoteColor(item.note_color) === c && "ring-2 ring-black/40",
                  )}
                  style={{ backgroundColor: noteColorCss(c) }}
                  onClick={() => onNoteColorChange(item.id, c)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {isPin && (
        <div className="flex h-full w-full items-start justify-center">
          <PushPin className="h-full w-auto drop-shadow-md" />
        </div>
      )}

      {selected && (
        <>
          <div
            data-handle="rotate"
            className="absolute left-1/2 top-0 z-10 h-3 w-3 -translate-x-1/2 -translate-y-5 cursor-grab rounded-full border-2 border-white bg-sky-500 shadow"
            onPointerDown={(e) => onPointerDownRotate(e, item.id)}
          />
          <div className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-sky-400/80" />
          {!isPin && (
            <div
              data-handle="resize"
              className="absolute bottom-0 right-0 z-10 h-3.5 w-3.5 translate-x-1/2 translate-y-1/2 cursor-se-resize rounded-sm border-2 border-white bg-sky-500 shadow"
              onPointerDown={(e) => onPointerDownResize(e, item.id)}
            />
          )}
        </>
      )}
    </div>
  );
}
