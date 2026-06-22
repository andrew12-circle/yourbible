import { Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { isDirectPolishEnvConfigured } from "@/lib/ai/polishText";
import { useAiWritingAssistControl } from "@/hooks/useAiWritingAssistControl";
import { AiWritingAssistPrivacyDialog } from "@/components/writing/AiWritingAssistPrivacyDialog";

type Tone = "default" | "onCover";

interface Props {
  /** Tighter layout for headers / toolbars. */
  compact?: boolean;
  /** `onCover`: light text for the journal gradient header. */
  tone?: Tone;
  className?: string;
}

export default function AiWritingAssistToggle({ compact, tone = "default", className }: Props) {
  const { enabled, setAssistEnabled, confirmOpen, confirmEnable, cancelEnable } = useAiWritingAssistControl();
  const direct = isDirectPolishEnvConfigured();

  const labelClass =
    tone === "onCover"
      ? "text-white/95"
      : "text-foreground";

  const hintClass =
    tone === "onCover"
      ? "text-white/70"
      : "text-muted-foreground";

  return (
    <>
      <div
        className={cn(
          "flex flex-col gap-1",
          compact && "max-w-[11rem] sm:max-w-none",
          tone === "onCover" && "items-end text-right",
          className,
        )}
      >
        <div className={cn("flex items-center gap-2", tone === "onCover" && "flex-row-reverse")}>
          <Switch
            id="yb-ai-writing-assist"
            checked={enabled}
            onCheckedChange={setAssistEnabled}
            className={cn(
              tone === "onCover" &&
                "data-[state=unchecked]:bg-white/25 data-[state=checked]:bg-white data-[state=checked]:text-foreground",
            )}
            aria-label="AI writing assist"
          />
          <Label
            htmlFor="yb-ai-writing-assist"
            className={cn(
              "flex cursor-pointer items-center gap-1.5 text-xs font-medium leading-tight",
              labelClass,
              compact && "text-[11px]",
            )}
          >
            <Sparkles className={cn("h-3.5 w-3.5 shrink-0 opacity-80", tone === "onCover" && "text-white")} aria-hidden />
            AI writing assist
          </Label>
        </div>
        {!compact && (
          <p className={cn("text-[10px] leading-snug", hintClass, tone === "onCover" && "max-w-[14rem]")}>
            Off by default. When on, spelling and grammar are lightly corrected as you finish each word and when you
            pause — journal text is sent to AI for that step.
          </p>
        )}
        {enabled && !direct && (
          <p className={cn("text-[10px] leading-snug", hintClass, tone === "onCover" && "max-w-[15rem]")}>
            Uses the app&apos;s cloud polish (Supabase + Gemini) when you&apos;re signed in, or set{" "}
            <span className="font-mono">VITE_AI_POLISH_URL</span> and <span className="font-mono">VITE_AI_POLISH_KEY</span>{" "}
            for your own endpoint. If polish always fails, the server may need <span className="font-mono">GEMINI_API_KEY</span>{" "}
            or turn this off.
          </p>
        )}
      </div>
      <AiWritingAssistPrivacyDialog open={confirmOpen} onConfirm={confirmEnable} onCancel={cancelEnable} />
    </>
  );
}

export function AiWritingAssistToolbarButton({ className }: { className?: string }) {
  const { enabled, setAssistEnabled, confirmOpen, confirmEnable, cancelEnable } = useAiWritingAssistControl();

  return (
    <>
      <button
        type="button"
        onClick={() => setAssistEnabled(!enabled)}
        className={cn(
          "p-1.5 rounded-md hover:bg-muted",
          enabled ? "text-primary bg-primary/10" : "text-muted-foreground",
          className,
        )}
        aria-label={enabled ? "AI writing assist on" : "Turn on AI writing assist"}
        aria-pressed={enabled}
        title={
          enabled
            ? "AI writing assist on — turn off in Settings"
            : "Turn on AI writing assist (sends journal text to AI)"
        }
      >
        <Sparkles className="w-4 h-4" />
      </button>
      <AiWritingAssistPrivacyDialog open={confirmOpen} onConfirm={confirmEnable} onCancel={cancelEnable} />
    </>
  );
}
