import { ClipboardCopy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  onCopy?: () => void;
  onRetry?: () => void;
  copyDisabled?: boolean;
  retryDisabled?: boolean;
  className?: string;
};

/** Gemini-style icon row under an assistant turn. */
export default function ResearchMessageActions({
  onCopy,
  onRetry,
  copyDisabled,
  retryDisabled,
  className,
}: Props) {
  if (!onCopy && !onRetry) return null;

  return (
    <div className={cn("mt-1.5 flex items-center gap-0.5", className)}>
      {onRetry ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-muted-foreground/80 hover:text-foreground"
          disabled={retryDisabled}
          onClick={onRetry}
          aria-label="Regenerate response"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      ) : null}
      {onCopy ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-muted-foreground/80 hover:text-foreground"
          disabled={copyDisabled}
          onClick={onCopy}
          aria-label="Copy response"
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
