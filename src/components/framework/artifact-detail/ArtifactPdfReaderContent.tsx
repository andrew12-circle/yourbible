import { useRef, useState } from "react";
import { ExternalLink, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import ArtifactPdfPageViewer from "@/components/framework/artifact-detail/ArtifactPdfPageViewer";
import { useArtifactPdfSignedUrl } from "@/hooks/useArtifactPdfSignedUrl";
import { attachArtifactSourcePdf } from "@/lib/framework/attachArtifactSourcePdf";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  artifactId?: string;
  userId?: string | null;
  storagePaths: string[];
  onPdfAttached?: () => void | Promise<void>;
  /** When true, PDF loads only while the panel is visible (mobile tab). */
  active?: boolean;
  /** Warm signed URLs before the reader opens (cover on detail page). */
  prefetch?: boolean;
  className?: string;
  showOpenInTab?: boolean;
};

export default function ArtifactPdfReaderContent({
  title,
  artifactId,
  userId = null,
  storagePaths,
  onPdfAttached,
  active = true,
  prefetch = false,
  className,
  showOpenInTab = true,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedPath, setAttachedPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const paths = [...new Set([...(attachedPath ? [attachedPath] : []), ...storagePaths.filter(Boolean)])];
  const shouldResolveUrl = prefetch || active;
  const { url, error, loading } = useArtifactPdfSignedUrl(paths, shouldResolveUrl);
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
  const showUrlSpinner = (loading || uploading) && !url;

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col", className)}>
      {showOpenInTab && url ? (
        <div className="absolute right-3 top-3 z-20">
          <Button
            type="button"
            size="sm"
            variant="outline"
            asChild
            className="border-white/20 bg-black/50 text-white shadow-sm backdrop-blur-sm hover:bg-black/70 hover:text-white"
          >
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden />
              Open in tab
            </a>
          </Button>
        </div>
      ) : null}

      {showUrlSpinner ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#1c1c1e] text-sm text-white/80">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
          {uploading ? "Uploading PDF…" : "Opening book…"}
        </div>
      ) : null}

      {showMissing ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-muted/30 px-6 text-center">
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

      {url && active ? <ArtifactPdfPageViewer pdfUrl={url} title={title} className="min-h-0 flex-1" /> : null}
    </div>
  );
}
