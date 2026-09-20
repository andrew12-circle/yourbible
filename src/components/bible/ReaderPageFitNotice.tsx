interface Props { onOpenFullPassage: () => void }

/** No silent clipping or automatic scroll mode when one unit cannot fit a physical page. */
export function ReaderPageFitNotice({ onOpenFullPassage }: Props) {
  return (
    <div role="status" data-reader-fit-notice className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-paper px-6 text-center">
      <p>This passage needs more room at the current page size.</p>
      <button type="button" onClick={onOpenFullPassage} className="min-h-11 rounded border border-border px-4 py-2 text-sm">
        Open full passage
      </button>
      <p className="text-xs text-muted-foreground">Opens continuous reading without changing the text or your font size.</p>
    </div>
  );
}
