import { useCallback, useEffect, useRef, useState } from "react";
import { VisionBoardItem } from "@/components/vision-board/VisionBoardItem";
import type { VisionBoardItemRow } from "@/lib/vision-board/api";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  clampTransform,
  rotationFromPointer,
  type BackgroundKey,
  type NoteColor,
} from "@/lib/vision-board/boardGeometry";
import { cn } from "@/lib/utils";

type DragMode = "move" | "resize" | "rotate";

type DragState = {
  mode: DragMode;
  id: string;
  startClientX: number;
  startClientY: number;
  origin: VisionBoardItemRow;
  altRotate?: boolean;
};

type Props = {
  background: BackgroundKey;
  items: VisionBoardItemRow[];
  photoUrls: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onTransformLive: (id: string, patch: Partial<VisionBoardItemRow>) => void;
  onTransformCommit: (id: string, patch: Partial<VisionBoardItemRow>) => void;
  onNoteTextChange: (id: string, text: string) => void;
  onNoteColorChange: (id: string, color: NoteColor) => void;
  className?: string;
};

export function VisionBoardCanvas({
  background,
  items,
  photoUrls,
  selectedId,
  onSelect,
  onTransformLive,
  onTransformCommit,
  onNoteTextChange,
  onNoteColorChange,
  className,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const livePatchRef = useRef<Partial<VisionBoardItemRow> | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => {
      const pad = 16;
      const sx = (el.clientWidth - pad) / BOARD_WIDTH;
      const sy = (el.clientHeight - pad) / BOARD_HEIGHT;
      setScale(Math.min(sx, sy, 1.25));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clientToBoard = useCallback(
    (clientX: number, clientY: number) => {
      const board = boardRef.current;
      if (!board) return { x: 0, y: 0 };
      const rect = board.getBoundingClientRect();
      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      };
    },
    [scale],
  );

  const applyDrag = useCallback(
    (clientX: number, clientY: number, altKey: boolean) => {
      const drag = dragRef.current;
      if (!drag) return;
      const origin = drag.origin;
      const dx = (clientX - drag.startClientX) / scale;
      const dy = (clientY - drag.startClientY) / scale;
      const mode = drag.altRotate || (drag.mode === "move" && altKey) ? "rotate" : drag.mode;

      let patch: Partial<VisionBoardItemRow>;
      if (mode === "move") {
        patch = clampTransform({
          x: origin.x + dx,
          y: origin.y + dy,
          width: origin.width,
          height: origin.height,
          rotation: origin.rotation,
        });
      } else if (mode === "resize") {
        patch = clampTransform({
          x: origin.x,
          y: origin.y,
          width: origin.width + dx,
          height: origin.height + dy,
          rotation: origin.rotation,
        });
      } else {
        const centerX = origin.x + origin.width / 2;
        const centerY = origin.y + origin.height / 2;
        const pt = clientToBoard(clientX, clientY);
        patch = { rotation: rotationFromPointer(centerX, centerY, pt.x, pt.y) };
      }
      livePatchRef.current = patch;
      onTransformLive(drag.id, patch);
    },
    [clientToBoard, onTransformLive, scale],
  );

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    const patch = livePatchRef.current;
    dragRef.current = null;
    livePatchRef.current = null;
    if (!patch) return;
    onTransformCommit(drag.id, patch);
  }, [onTransformCommit]);

  const beginDrag = useCallback(
    (e: React.PointerEvent, id: string, mode: DragMode) => {
      e.preventDefault();
      e.stopPropagation();
      const item = items.find((i) => i.id === id);
      if (!item) return;
      livePatchRef.current = null;
      dragRef.current = {
        mode,
        id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origin: { ...item },
        altRotate: mode === "move" && e.altKey,
      };
      onSelect(id);

      const onMove = (ev: PointerEvent) => applyDrag(ev.clientX, ev.clientY, ev.altKey);
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        endDrag();
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [applyDrag, endDrag, items, onSelect],
  );

  return (
    <div
      ref={viewportRef}
      className={cn("relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-2", className)}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.boardSurface === "1") {
          onSelect(null);
        }
      }}
    >
      <div
        ref={boardRef}
        data-board-surface="1"
        className={cn("vision-board-surface relative shrink-0", `vision-board-surface--${background}`)}
        style={{
          width: BOARD_WIDTH,
          height: BOARD_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {items.map((item) => (
          <VisionBoardItem
            key={item.id}
            item={item}
            selected={selectedId === item.id}
            photoUrl={item.storage_path ? photoUrls[item.storage_path] : null}
            onSelect={onSelect}
            onPointerDownMove={(e, id) => beginDrag(e, id, "move")}
            onPointerDownResize={(e, id) => beginDrag(e, id, "resize")}
            onPointerDownRotate={(e, id) => beginDrag(e, id, "rotate")}
            onNoteTextChange={onNoteTextChange}
            onNoteColorChange={onNoteColorChange}
          />
        ))}
      </div>
    </div>
  );
}
