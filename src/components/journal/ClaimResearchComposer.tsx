import { useRef } from "react";
import { ArrowUp, BookOpen, ChevronDown, NotebookPen, Plus, Settings2, Square } from "lucide-react";
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
import {
  claimResearchColumn,
  geminiChip,
  geminiInputShell,
} from "@/lib/journal/claimResearchTheme";
import { textareaHeightForLines, useAutoGrowTextarea } from "@/hooks/useAutoGrowTextarea";

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

const MIN_HEIGHT_PX = textareaHeightForLines(1);
const MAX_HEIGHT_PX = textareaHeightForLines(7);

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
  const canSend = Boolean(input.trim()) && !disabled && !sending;

  useAutoGrowTextarea(taRef, input, { maxLines: 7, minLines: 1 });

  const applyChip = (text: string) => {
    onInputChange(text);
    requestAnimationFrame(() => {
      taRef.current?.focus();
    });
  };

  return (
    <div
      className={cn(
        "shrink-0 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-2",
        className,
      )}
    >
      <div className={claimResearchColumn}>
        <div className="mb-2.5 flex flex-wrap justify-center gap-2">
          {CLAIM_RESEARCH_PROMPT_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              disabled={disabled || sending}
              onClick={() => applyChip(chip.text)}
              className={geminiChip}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className={geminiInputShell}>
          <Textarea
            ref={taRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (canSend) onSend();
              }
            }}
            rows={1}
            spellCheck
            disabled={disabled || sending}
            placeholder={sending ? "Thinking…" : "Ask about this claim"}
            style={{ minHeight: MIN_HEIGHT_PX, maxHeight: MAX_HEIGHT_PX }}
            className={cn(
              "!min-h-0 w-full resize-none overflow-hidden border-0 bg-transparent px-3 py-3",
              "text-[15px] leading-[1.65] shadow-none placeholder:text-muted-foreground/70",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "[scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.2)_transparent]",
            )}
          />

          <div className="flex items-center justify-between gap-2 px-1 pb-0.5 pt-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/10"
                  aria-label="Tools and options"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={onReflect} disabled={disabled}>
                  <NotebookPen className="mr-2 h-4 w-4" />
                  Save note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenReport}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Full research report
                </DropdownMenuItem>
                {chatId ? (
                  <DropdownMenuItem asChild>
                    <Link to={`/my-ai/${chatId}`}>Open in My AI</Link>
                  </DropdownMenuItem>
                ) : null}
                <div className="mt-1 space-y-3 border-t border-border/60 px-2 py-2">
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
                    <Switch
                      id="cr-gen-menu"
                      checked={includeGeneral}
                      onCheckedChange={onIncludeGeneralChange}
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex shrink-0 items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 gap-0.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground"
                  >
                    {packUseWeb ? "Web" : "Chat"}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onPackUseWebChange(!packUseWeb)}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    Toggle web search
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {sending ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full"
                  onClick={onStop}
                  aria-label="Stop"
                >
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  className={cn(
                    "h-10 w-10 shrink-0 rounded-full transition-colors",
                    canSend
                      ? "bg-[#4285F4] text-white hover:bg-[#1a73e8]"
                      : "bg-transparent text-muted-foreground/50 hover:bg-black/[0.04] dark:hover:bg-white/10",
                  )}
                  disabled={!canSend}
                  onClick={onSend}
                  aria-label="Send"
                >
                  <ArrowUp className="h-5 w-5" strokeWidth={2.25} />
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-3 text-[11px] text-muted-foreground/80">
          <button
            type="button"
            className="hover:text-foreground hover:underline disabled:opacity-40"
            disabled={sending || !canRetry}
            onClick={onRetry}
          >
            Regenerate last
          </button>
          <span aria-hidden>·</span>
          <span>{packUseWeb ? "Web search on" : "Companion chat"}</span>
        </div>
      </div>
    </div>
  );
}
