import { readerPageTurnTopOffsetClass } from "@/lib/bible/readerHubLayout";
import { cn } from "@/lib/utils";

type ReaderPageTurnHotZonesProps = {
  overlayPos: string;
  compactChrome: boolean;
  hubInline: boolean;
  showReaderDock: boolean;
  inkMode: boolean;
  onTurn: (delta: number) => void;
};

export function ReaderPageTurnHotZones({
  overlayPos,
  compactChrome,
  hubInline,
  showReaderDock,
  inkMode,
  onTurn,
}: ReaderPageTurnHotZonesProps) {
  const bottomClass = showReaderDock
    ? "bottom-[calc(var(--reader-mobile-dock-h,5.5rem)+var(--reader-mobile-chapter-bar-h,2.5rem)+env(safe-area-inset-bottom,0px)+1rem)]"
    : compactChrome
      ? "bottom-[calc(var(--reader-mobile-chapter-bar-h,2.5rem)+env(safe-area-inset-bottom,0px)+1rem)]"
      : "bottom-safe-16";

  return (
    <>
      <button
        onClick={() => onTurn(-1)}
        aria-label="Previous page"
        className={cn(
          overlayPos,
          readerPageTurnTopOffsetClass(compactChrome, hubInline),
          "left-0 w-8 z-[5] opacity-0",
          bottomClass,
          inkMode && "pointer-events-none",
        )}
      />
      <button
        onClick={() => onTurn(1)}
        aria-label="Next page"
        className={cn(
          overlayPos,
          readerPageTurnTopOffsetClass(compactChrome, hubInline),
          "right-0 w-8 z-[5] opacity-0",
          bottomClass,
          inkMode && "pointer-events-none",
        )}
      />
    </>
  );
}
