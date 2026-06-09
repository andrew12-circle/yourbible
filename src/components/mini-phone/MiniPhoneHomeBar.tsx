import { useMiniPhone } from "@/contexts/MiniPhoneContext";

interface MiniPhoneHomeBarProps {
  onDragPointerDown: (e: React.PointerEvent) => void;
  onDragPointerMove: (e: React.PointerEvent) => void;
  onDragPointerUp: (e: React.PointerEvent) => void;
}

/** iOS-style home indicator — tap returns to the phone launcher; drag moves the phone window. */
export function MiniPhoneHomeBar({
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerUp,
}: MiniPhoneHomeBarProps) {
  const { goHome, activeRoute } = useMiniPhone();
  const inApp = activeRoute !== null;

  return (
    <div className="shrink-0 flex flex-col items-center relative z-10 pb-2 pt-2 -mt-4">
      {inApp && (
        <button
          type="button"
          onClick={goHome}
          className="mb-1 px-8 py-1.5 focus:outline-none"
          aria-label="Phone home screen"
          title="Phone home screen"
        >
          <div className="h-1 w-24 rounded-full shadow-sm bg-foreground/70 hover:bg-foreground transition-colors" />
        </button>
      )}
      <button
        type="button"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        style={{ touchAction: "none" }}
        className="px-6 py-2 -my-2 cursor-grab active:cursor-grabbing focus:outline-none"
        title="Drag to move phone"
        aria-label="Drag to move phone"
      >
        <div className="h-1 w-24 rounded-full shadow-sm bg-white/80" />
      </button>
    </div>
  );
}
