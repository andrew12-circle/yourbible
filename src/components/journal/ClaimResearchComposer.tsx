import { useRef } from "react";
import { BookOpen, NotebookPen, RefreshCw, Send, Settings2, Square } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CLAIM_RESEARCH_PROMPT_CHIPS } from "@/lib/framework/claimResearchPack";

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onRetry: () => void;
  sending: boolean;
  disabled: boolean;
  canRetry: boolean;
  packUseWeb: boolean;
  onPackUseWebChange: (v: boolean) => void;
  includeGeneral: boolean;
  onIncludeGeneralChange: (v: boolean) => void;
  chatId: string | null;
  onReflect: () => void;
  onOpenReport: () => void;
  className?: string;
};

export default function ClaimResearchComposer({
  input,
  onInputChange,
  onSend,
  onStop,
  onRetry,
  sending,
  disabled,
  canRetry,
  packUseWeb,
  onPackUseWebChange,
  includeGeneral,
  onIncludeGeneralChange,
  chatId,
  onReflect,
  onOpenReport,
  className,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div
      className={cn(
        "shrink-0 border-t border-border/60 bg-background/90 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl",
        className,
      )}
    >
      <div className="mb-2.5 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CLAIM_RESEARCH_PROMPT_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            disabled={disabled || sending}
            onClick={() => {
              onInputChange(chip.text);
              setTimeout(() => taRef.current?.focus(), 30);
            }}
            className={cn(
              "shrink-0 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-left text-[11px] font-medium leading-snug text-foreground/90",
              "transition-colors hover:border-primary/30 hover:bg-primary/5 active:bg-primary/10",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2 rounded-2xl border border-border/80 bg-card p-1.5 shadow-[0_4px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        <Textarea
          ref={taRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!sending && !disabled) onSend();
            }
          }}
          rows={1}
          spellCheck
          disabled={disabled || sending}
          placeholder={sending ? "Thinking…" : "Ask a follow-up…"}
          className="min-h-[44px] max-h-28 min-w-0 flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-[15px] leading-snug shadow-none focus-visible:ring-0"
        />
        <div className="mb-0.5 flex shrink-0 items-center gap-0.5 pr-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground"
            disabled={sending || !canRetry}
            onClick={onRetry}
            aria-label="Retry"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {sending ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={onStop}
              aria-label="Stop"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon"
            className="h-10 w-10 rounded-full shadow-md"
            disabled={disabled || sending || !input.trim()}
            onClick={onSend}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 rounded-full px-2.5 text-[11px] text-muted-foreground"
            disabled={disabled}
            onClick={onReflect}
          >
            <NotebookPen className="h-3.5 w-3.5" />
            Save note
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 rounded-full px-2 text-[11px] text-muted-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Options
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onOpenReport}>
              <BookOpen className="mr-2 h-4 w-4" />
              Full research report
            </DropdownMenuItem>
            {chatId ? (
              <DropdownMenuItem asChild>
                <Link to={`/my-ai/${chatId}`}>Open in My AI</Link>
              </DropdownMenuItem>
            ) : null}
            <div className="px-2 py-2 space-y-3 border-t border-border/60 mt-1">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="cr-web-menu" className="text-xs font-normal">
                  Web search
                </Label>
                <Switch id="cr-web-menu" checked={packUseWeb} onCheckedChange={onPackUseWebChange} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="cr-gen-menu" className="text-xs font-normal">
                  General knowledge
                </Label>
                <Switch id="cr-gen-menu" checked={includeGeneral} onCheckedChange={onIncludeGeneralChange} />
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
