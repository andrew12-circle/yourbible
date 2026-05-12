import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import { cn } from "@/lib/utils";

export type DictateButtonHandle = { stop: () => void };

export type DictateButtonProps = {
  onAppend: (chunk: string) => void;
  onInterim?: (partial: string) => void;
  language?: string;
  size?: "sm" | "md";
  className?: string;
};

export const DictateButton = forwardRef<DictateButtonHandle, DictateButtonProps>(function DictateButton(
  { onAppend, onInterim, language, size = "sm", className },
  ref,
) {
  const { supported, listening, error, stop, toggle } = useSpeechDictation({
    onAppend,
    onInterim,
    language,
  });

  useImperativeHandle(ref, () => ({ stop }), [stop]);

  const lastToasted = useRef<string | null>(null);
  useEffect(() => {
    if (error && error !== lastToasted.current) {
      lastToasted.current = error;
      toast({ title: "Dictation", description: error, variant: "destructive" });
    }
    if (!error) lastToasted.current = null;
  }, [error]);

  const iconClass = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const btnClass = size === "md" ? "h-10 w-10" : "h-8 w-8";

  const tip = !supported
    ? "Voice dictation isn't supported in this browser yet."
    : listening
      ? "Stop dictation"
      : "Dictate";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!supported}
          aria-pressed={listening}
          aria-label={listening ? "Stop dictation" : "Dictate"}
          className={cn(
            btnClass,
            "relative shrink-0 text-muted-foreground hover:text-foreground",
            className,
          )}
          onClick={() => {
            if (supported) toggle();
          }}
        >
          {listening ? (
            <>
              <span
                className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-red-500"
                aria-hidden
              />
              <MicOff className={iconClass} />
              <span className="sr-only">Listening…</span>
            </>
          ) : (
            <Mic className={iconClass} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tip}</TooltipContent>
    </Tooltip>
  );
});
