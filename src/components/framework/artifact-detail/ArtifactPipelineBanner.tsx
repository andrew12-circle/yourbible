import { FileText, Loader2 } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  status: string;
  kind: string;
  elapsed: number;
  label: string;
  hint: string;
  onPasteTranscript: () => void;
};

function ArtifactPipelineBanner({
  status,
  kind: _kind,
  elapsed,
  label,
  hint,
  onPasteTranscript,
}: Props) {
  return (
    <div className="mb-5 rounded-lg border border-border bg-muted/30 p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-medium">
        <Loader2 className="h-4 w-4 animate-spin" />
        {label}
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">{elapsed}s</span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {status === "fetching" && elapsed > 90 && (
        <p className="mt-2 text-xs text-amber-700">
          Taking longer than expected. Long videos can take several minutes; automatic retries are still running.
        </p>
      )}
      {(status === "fetching" || status === "transcribing") && (
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={onPasteTranscript}>
            <FileText className="mr-1 h-3.5 w-3.5" /> Paste transcript instead
          </Button>
        </div>
      )}
    </div>
  );
}

export default memo(ArtifactPipelineBanner);
