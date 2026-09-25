import { lazy, Suspense, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Palette, X } from "lucide-react";
import type { ChapterContextBundle } from "@/data/biblePlates/types";
import { VisualExplorerBoundary } from "./visual/explorer/VisualExplorerBoundary";
const Workspace = lazy(() => import("./visual/explorer/VisualLibraryWorkspace"));
type Props = {
  open: boolean; onOpenChange: (open: boolean) => void; context: ChapterContextBundle; bookName: string;
  ownerId?: string; translation?: string;
};
/** The reader stays mounted. Catalog/map failures cannot replace the Scripture page. */
export function ChapterContextSheet({ open, onOpenChange, context, bookName, ownerId, translation }: Props) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/45 backdrop-blur-sm" />
      <Dialog.Content
        data-visual-workspace-dialog
        className="fixed left-1/2 top-1/2 z-[201] flex h-[100dvh] w-full max-w-[1480px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden bg-background text-foreground shadow-2xl outline-none sm:h-[94dvh] sm:w-[96vw] sm:rounded-2xl sm:border"
        onKeyDown={event => event.stopPropagation()}
        onEscapeKeyDown={event => event.stopPropagation()}
        onOpenAutoFocus={() => {
          // Capture before the focus scope moves into the dialog, not in a later effect.
          const active = document.activeElement;
          returnFocus.current = active instanceof HTMLElement && active !== document.body && !active.closest("[data-visual-workspace-dialog]") ? active : null;
        }}
        onCloseAutoFocus={event => {
          event.preventDefault();
          const trigger = returnFocus.current?.isConnected ? returnFocus.current : document.querySelector<HTMLElement>("[data-visual-explorer-trigger]");
          trigger?.focus({ preventScroll: true });
        }}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
          <div className="min-w-0"><Dialog.Title className="flex items-center gap-2 font-serif text-xl"><Palette className="h-5 w-5 shrink-0" aria-hidden="true" />Explore the Bible</Dialog.Title><Dialog.Description className="mt-1 text-xs text-muted-foreground">Art, maps and places alongside {bookName} {context.chapter}.</Dialog.Description></div>
          <Dialog.Close asChild><button type="button" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm hover:bg-muted" aria-label="Return to Bible"><span className="hidden sm:inline">Return to reading</span><X className="h-4 w-4" aria-hidden="true" /></button></Dialog.Close>
        </header>
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col pb-[env(safe-area-inset-bottom)]">
          {open && <VisualExplorerBoundary onClose={() => onOpenChange(false)}><Suspense fallback={<p role="status" className="p-6 text-sm">Opening your visual library…</p>}><Workspace book={context.bookAbbr} chapter={context.chapter} ownerId={ownerId} translation={translation} context={context} onNavigate={() => onOpenChange(false)} /></Suspense></VisualExplorerBoundary>}
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
