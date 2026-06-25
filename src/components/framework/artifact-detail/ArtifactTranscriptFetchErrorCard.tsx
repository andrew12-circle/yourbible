import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  error: string;
  retryingFetch?: boolean;
  inFlight?: boolean;
  showRetry?: boolean;
  showReanalyze?: boolean;
  onRetry?: () => void;
  onPaste: () => void;
  onReanalyze?: () => void;
  className?: string;
  /** Warning when transcript/chapters remain usable despite analysis limits. */
  variant?: "destructive" | "warning";
};

/** Split server transcript errors into a short headline + technical log. */
export function parseTranscriptFetchError(error: string): {
  headline: string;
  hint: string | null;
  attempts: string | null;
} {
  const trimmed = error.trim();
  if (/rate limit|provider limit/i.test(trimmed)) {
    const headline = trimmed.replace(/\s+/g, " ").trim();
    return {
      headline,
      hint: "If insight cards are already visible below, you can keep studying — tap Re-analyze later only if you want more coverage.",
      attempts: null,
    };
  }
  const attemptsIdx = trimmed.indexOf("Attempts:");
  if (attemptsIdx === -1) {
    return {
      headline: trimmed.replace(/^Could not fetch transcript:?\s*/i, "").trim() || "Could not fetch transcript.",
      hint: null,
      attempts: null,
    };
  }

  const headline =
    trimmed
      .slice(0, attemptsIdx)
      .replace(/^Could not fetch transcript:?\s*/i, "")
      .replace(/^Could not start transcript fetch:?\s*/i, "")
      .trim() || "Could not fetch transcript.";

  let rest = trimmed.slice(attemptsIdx + "Attempts:".length).trim();
  let hint: string | null = null;

  const hintMarkers = ["YouTube blocks our servers", "For long videos", "Tap "];
  for (const marker of hintMarkers) {
    const idx = rest.indexOf(marker);
    if (idx > 0) {
      const splitAt = rest.lastIndexOf(".", idx);
      if (splitAt >= 0) {
        hint = rest.slice(splitAt + 1).trim();
        rest = rest.slice(0, splitAt + 1).trim();
        break;
      }
    }
  }

  return {
    headline,
    hint,
    attempts: rest || null,
  };
}

export default function ArtifactTranscriptFetchErrorCard({
  error,
  retryingFetch = false,
  inFlight = false,
  showRetry = false,
  showReanalyze = false,
  onRetry,
  onPaste,
  onReanalyze,
  className,
  variant = "destructive",
}: Props) {
  const { headline, hint, attempts } = parseTranscriptFetchError(error);
  const warning = variant === "warning";

  return (
    <div
      className={cn(
        "mb-4 rounded border p-3 text-sm",
        warning
          ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
          : "border-destructive/40 bg-destructive/10 text-destructive",
        className,
      )}
      role="alert"
    >
      <p
        className={cn(
          "font-medium leading-snug",
          warning ? "text-amber-950 dark:text-amber-50" : "text-destructive",
        )}
      >
        {headline}
      </p>
      {hint ? (
        <p
          className={cn(
            "mt-2 text-xs leading-relaxed",
            warning ? "text-amber-900/90 dark:text-amber-100/90" : "text-destructive/90",
          )}
        >
          {hint}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {showRetry && onRetry ? (
          <Button size="sm" variant="outline" disabled={retryingFetch || inFlight} onClick={onRetry}>
            <RefreshCw className={cn("mr-1 h-3.5 w-3.5", retryingFetch && "animate-spin")} aria-hidden />
            {retryingFetch ? "Fetching…" : "Try fetch again"}
          </Button>
        ) : null}
        <Button size="sm" variant="outline" onClick={onPaste}>
          <FileText className="mr-1 h-3.5 w-3.5" aria-hidden />
          Paste transcript
        </Button>
        {showReanalyze && onReanalyze ? (
          <Button size="sm" variant="outline" disabled={inFlight} onClick={onReanalyze}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden />
            Re-analyze
          </Button>
        ) : null}
      </div>

      {attempts ? (
        <details
          className={cn("mt-3 text-xs", warning ? "text-amber-900/90 dark:text-amber-100/90" : "text-destructive/90")}
        >
          <summary className="cursor-pointer select-none font-medium">Technical details</summary>
          <pre
            className={cn(
              "mt-2 max-h-40 overflow-y-auto overscroll-y-contain whitespace-pre-wrap break-words rounded border p-2 font-mono text-[10px] leading-snug",
              warning
                ? "border-amber-500/20 bg-amber-500/5"
                : "border-destructive/20 bg-destructive/5",
            )}
          >
            {attempts}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
