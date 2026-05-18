import { Loader2, Mic, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onExit: () => void;
  onDictate?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onPointerDown?: () => void;
  aiBusy?: boolean;
  className?: string;
  rounded?: "pill" | "card";
};

export default function InlineJournalChatComposer({
  value,
  onChange,
  onSend,
  onExit,
  onDictate,
  onFocus,
  onBlur,
  onPointerDown,
  aiBusy = false,
  className,
  rounded = "pill",
}: Props) {
  const shellClass =
    rounded === "pill"
      ? "flex items-end gap-2 rounded-[28px] border border-border bg-background px-2 py-1.5 shadow-sm"
      : "flex items-end gap-2 rounded-xl border border-border bg-muted/30 px-2 py-2";

  return (
    <div className={cn(shellClass, className)}>
      <button
        type="button"
        onClick={onExit}
        className="h-9 w-9 shrink-0 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
        aria-label="Back to writing"
      >
        <Plus className="h-5 w-5 rotate-45" />
      </button>
      <Textarea
        value={value}
        onPointerDown={onPointerDown}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        placeholder={aiBusy ? "Thinking…" : "Message"}
        className="min-h-[36px] max-h-40 flex-1 resize-none border-0 bg-transparent px-1 py-2 text-[16px] leading-snug shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      {onDictate && (
        <button
          type="button"
          onClick={onDictate}
          className="h-9 w-9 shrink-0 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Dictate"
        >
          <Mic className="h-5 w-5" />
        </button>
      )}
      <Button
        type="button"
        size="icon"
        onClick={onSend}
        disabled={aiBusy || !value.trim()}
        className="h-9 w-9 shrink-0 rounded-full"
        aria-label="Send"
      >
        {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </Button>
    </div>
  );
}
