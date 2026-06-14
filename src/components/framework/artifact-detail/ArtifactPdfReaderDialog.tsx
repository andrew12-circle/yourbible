import { useRef, useState } from "react";
import { ExternalLink, Loader2, Upload } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { useArtifactPdfSignedUrl } from "@/hooks/useArtifactPdfSignedUrl";
import { attachArtifactSourcePdf } from "@/lib/framework/attachArtifactSourcePdf";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedPath, setAttachedPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const paths = [...new Set([...(attachedPath ? [attachedPath] : []), ...storagePaths.filter(Boolean)])];
  const { url, error, loading } = useArtifactPdfSignedUrl(paths, open);
  const canUpload = Boolean(artifactId && userId);

  const handlePickPdf = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !artifactId || !userId) return;

    setUploading(true);
    setUploadError(null);
    try {
      const path = await attachArtifactSourcePdf(userId, artifactId, file);
      setAttachedPath(path);
      await onPdfAttached?.();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  };

  const showMissing = !loading && !uploading && !url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[200]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-[200] flex max-h-[min(94vh,920px)] w-[min(98vw,1100px)] translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden border bg-background p-0 shadow-lg duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg sm:max-w-[1100px]",
          )}
        >
          <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-3 sm:px-6">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="min-w-0">
                <DialogTitle className="line-clamp-2 text-left font-display text-xl tracking-tight">
                  {title}
                </DialogTitle>
                {author ? (
                  <DialogDescription className="mt-0.5 text-left">{author}</DialogDescription>
                ) : (
                  <DialogDescription className="sr-only">PDF reader</DialogDescription>
                )}
              </div>
              {url ? (
                <Button type="button" size="sm" variant="outline" asChild className="absolute right-12 top-3 shrink-0">
                  <a href={url} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden />
                    Open in tab
                  </a>
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          <div className="relative min-h-[min(78vh,800px)] flex-1 bg-muted/30">
            {loading || uploading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                {uploading ? "Uploading PDF…" : "Loading PDF…"}
              </div>
            ) : null}
            {showMissing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
                <div className="max-w-md space-y-2">
                  <p className="text-sm text-foreground">
                    {error ?? "Original PDF not available for this book."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Upload the PDF file here to read it with full formatting. Your extracted text and claims stay as
                    they are.
                  </p>
                </div>
                {canUpload ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="sr-only"
                      onChange={(e) => void handleFileChange(e)}
                    />
                    <Button type="button" onClick={handlePickPdf} disabled={uploading}>
                      <Upload className="mr-2 h-4 w-4" aria-hidden />
                      Upload original PDF
                    </Button>
                  </>
                ) : null}
                {uploadError ? <p className="max-w-md text-xs text-destructive">{uploadError}</p> : null}
              </div>
            ) : null}
            {url ? (
              <embed
                title={title}
                src={url}
                type="application/pdf"
                className="h-full min-h-[min(78vh,800px)] w-full border-0 bg-white"
              />
            ) : null}
          </div>

          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
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
