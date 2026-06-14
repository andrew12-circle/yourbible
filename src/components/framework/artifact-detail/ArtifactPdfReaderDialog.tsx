import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import ArtifactPdfReaderContent from "@/components/framework/artifact-detail/ArtifactPdfReaderContent";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  author?: string | null;
  artifactId?: string;
  userId?: string | null;
  storagePaths: string[];
  onPdfAttached?: () => void | Promise<void>;
};

export default function ArtifactPdfReaderDialog({
  open,
  onOpenChange,
  title,
  author = null,
  artifactId,
  userId = null,
  storagePaths,
  onPdfAttached,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[200] bg-black/70" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-[200] flex max-h-[min(96vh,940px)] w-[min(98vw,1120px)] translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden border border-white/10 bg-[#1c1c1e] p-0 text-white shadow-2xl duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-w-[1120px] sm:rounded-xl",
          )}
        >
          <DialogHeader className="shrink-0 border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="min-w-0">
                <DialogTitle className="line-clamp-2 text-left font-display text-lg tracking-tight text-white sm:text-xl">
                  {title}
                </DialogTitle>
                {author ? (
                  <DialogDescription className="mt-0.5 text-left text-white/60">{author}</DialogDescription>
                ) : (
                  <DialogDescription className="sr-only">PDF reader</DialogDescription>
                )}
              </div>
            </div>
          </DialogHeader>

          <ArtifactPdfReaderContent
            title={title}
            artifactId={artifactId}
            userId={userId}
            storagePaths={storagePaths}
            onPdfAttached={onPdfAttached}
            active={open}
            prefetch
            className="min-h-[min(80vh,820px)] flex-1"
          />

          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm text-white/70 opacity-90 ring-offset-background transition-opacity hover:text-white hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-[#1c1c1e]">
            <span className="sr-only">Close</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
