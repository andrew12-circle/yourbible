import { FileText } from "lucide-react";
import { memo, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import ArtifactPipelineScene, {
  artifactPipelineMicroCopy,
} from "@/components/framework/artifact-detail/ArtifactPipelineScene";
import { cn } from "@/lib/utils";

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
  const microLines = artifactPipelineMicroCopy[status] ?? [];
  const [microIndex, setMicroIndex] = useState(0);

  useEffect(() => {
    setMicroIndex(0);
  }, [status]);

  useEffect(() => {
    if (microLines.length <= 1) return;
    const id = window.setInterval(() => {
      setMicroIndex((current) => (current + 1) % microLines.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [microLines.length, status]);

  const microCopy = microLines[microIndex] ?? "";
  const showPaste = status === "fetching" || status === "transcribing";
  const stageAccent =
    status === "analyzing"
      ? "from-violet-500/15 via-background to-amber-500/10"
      : status === "fetching"
        ? "from-red-500/12 via-background to-background"
        : status === "transcribing"
          ? "from-amber-500/12 via-background to-background"
          : "from-muted/40 via-background to-background";

  const statusBadge = useMemo(() => {
    if (status === "analyzing") return "Research pass";
    if (status === "fetching") return "Transcript fetch";
    if (status === "transcribing") return "Audio transcribe";
    return "Processing";
  }, [status]);

  return (
    <section
      className={cn(
        "relative mb-5 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.03]",
      )}
      aria-live="polite"
      aria-busy="true"
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br", stageAccent)} aria-hidden />
      <ArtifactPipelineScene status={status} />

      <div className="relative border-t border-border/50 bg-background/75 px-4 py-3.5 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {statusBadge}
              </span>
              <span className="text-[11px] tabular-nums text-muted-foreground">{elapsed}s</span>
            </div>
            <p className="text-sm font-medium leading-snug text-foreground">{label}</p>
            {microCopy ? (
              <p key={microCopy} className="mt-1 text-xs text-violet-700/90 dark:text-violet-300/90 pipeline-micro-fade">
                {microCopy}
              </p>
            ) : null}
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
          </div>
        </div>

        {status === "fetching" && elapsed > 90 ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            Taking longer than expected. Long videos can take several minutes; automatic retries are still running.
          </p>
        ) : null}

        {showPaste ? (
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={onPasteTranscript}>
              <FileText className="mr-1 h-3.5 w-3.5" /> Paste transcript instead
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default memo(ArtifactPipelineBanner);
