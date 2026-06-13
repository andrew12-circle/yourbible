import { useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import {
  ArrowUp,
  Brain,
  ChevronDown,
  Loader2,
  NotebookPen,
  Plus,
  Sparkles,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DictateButton, type DictateButtonHandle } from "@/components/journal/DictateButton";
import ResponseDepthControl from "@/components/journal/ResponseDepthControl";
import MyAiResearchChips from "@/components/myai/MyAiResearchChips";
import { mergeDictatedText } from "@/hooks/useSpeechDictation";
import type { MyAiResearchScope } from "@/lib/myai/researchScope";
import { textareaHeightForLines, useAutoGrowTextarea } from "@/hooks/useAutoGrowTextarea";
import { myAiComposerColumn, myAiInputShell } from "@/lib/myai/myAiTheme";
import { mobileBottomDockPadding, mobileBottomDockTransform } from "@/lib/shell/mobileShellClasses";
import type { ResponseDepthSetting } from "@/lib/journal/responseDepth";
import { cn } from "@/lib/utils";

const DEPTH_LABELS: Record<ResponseDepthSetting, string> = {
  auto: "Auto",
  reflect: "Brief",
  deep: "Deep",
};

const MIN_HEIGHT_PX = textareaHeightForLines(1);
const MAX_HEIGHT_PX = textareaHeightForLines(6);

type Props = {
  input: string;
  onInputChange: Dispatch<SetStateAction<string>>;
  onSend: (textOverride?: string) => void;
  onResearchScope?: (scope: MyAiResearchScope) => void;
  onStop?: () => void;
  sending: boolean;
  editingMessageId?: string | null;
  onCancelEdit?: () => void;
  userId: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  responseDepth: ResponseDepthSetting;
  onResponseDepthChange: (value: ResponseDepthSetting) => void;
  includeGeneral: boolean;
  onIncludeGeneralChange: (value: boolean) => void;
  suggestedPrompts: readonly string[];
  onSuggestedPrompt: (prompt: string) => void;
  canSaveJournal: boolean;
  onSaveJournal: () => void;
  savingJournal: boolean;
  onNewChat: () => void;
  onOpenCognitiveState: () => void;
  keyboardInset?: number;
  onComposerPointerDown?: () => void;
  onComposerFocus?: () => void;
  onComposerBlur?: () => void;
  className?: string;
};

export default function MyAiComposer({
  input,
  onInputChange,
  onSend,
  onResearchScope,
  onStop,
  sending,
  editingMessageId,
  onCancelEdit,
  userId,
  textareaRef: externalTaRef,
  responseDepth,
  onResponseDepthChange,
  includeGeneral,
  onIncludeGeneralChange,
  suggestedPrompts,
  onSuggestedPrompt,
  canSaveJournal,
  onSaveJournal,
  savingJournal,
  onNewChat,
  onOpenCognitiveState,
  keyboardInset = 0,
  onComposerPointerDown,
  onComposerFocus,
  onComposerBlur,
  className,
}: Props) {
  const localTaRef = useRef<HTMLTextAreaElement>(null);
  const taRef = externalTaRef ?? localTaRef;
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const [dictInterim, setDictInterim] = useState("");

  const canSend = Boolean(input.trim()) && !sending;
  const showStop = sending && Boolean(onStop);

  useAutoGrowTextarea(taRef, input, { maxLines: 6, minLines: 1 });

  const handleSend = () => {
    if (!canSend) return;
    dictateRef.current?.stop();
    setDictInterim("");
    onSend();
  };

  const applyPrompt = (prompt: string) => {
    onSuggestedPrompt(prompt);
    requestAnimationFrame(() => taRef.current?.focus());
  };

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background via-background/95 to-transparent px-3 pb-3 pt-8 sm:px-4",
        className,
      )}
      style={{
        ...mobileBottomDockPadding("0.75rem"),
        ...mobileBottomDockTransform(keyboardInset),
      }}
    >
      <div className={cn("pointer-events-auto", myAiComposerColumn)}>
        {editingMessageId ? (
          <div className="mb-1 flex items-center justify-between px-1 text-[11px] text-muted-foreground">
            <span>Editing message</span>
            {onCancelEdit ? (
              <button type="button" className="underline-offset-2 hover:underline" onClick={onCancelEdit}>
                Cancel
              </button>
            ) : null}
          </div>
        ) : null}

        <div className={myAiInputShell}>
          <Textarea
            ref={taRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onPointerDown={onComposerPointerDown}
            onFocus={onComposerFocus}
            onBlur={onComposerBlur}
            rows={1}
            spellCheck
            disabled={sending}
            placeholder={sending ? "Thinking…" : editingMessageId ? "Edit message" : "Ask anything"}
            style={{ minHeight: MIN_HEIGHT_PX, maxHeight: MAX_HEIGHT_PX }}
            className={cn(
              "!min-h-0 w-full resize-none overflow-hidden border-0 bg-transparent px-3 py-1.5",
              "text-base leading-snug shadow-none placeholder:text-muted-foreground/70 md:text-[13px]",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "[scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.2)_transparent]",
            )}
          />

          <div className="flex items-center justify-between gap-1 px-0.5 pb-0.5 pt-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/10"
                  aria-label="Add and options"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72 max-w-[calc(100vw-2rem)]">
                <DropdownMenuItem onClick={onNewChat} disabled={sending}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  New chat
                </DropdownMenuItem>
                {canSaveJournal ? (
                  <DropdownMenuItem disabled={savingJournal || sending} onClick={onSaveJournal}>
                    <NotebookPen className="mr-2 h-4 w-4" />
                    {savingJournal ? "Saving…" : "Save to journal"}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={onOpenCognitiveState}>
                  <Brain className="mr-2 h-4 w-4" />
                  What My AI knows
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
                  Try asking
                </DropdownMenuLabel>
                {suggestedPrompts.map((prompt) => (
                  <DropdownMenuItem
                    key={prompt}
                    disabled={sending}
                    onClick={() => applyPrompt(prompt)}
                    className="whitespace-normal text-xs leading-snug"
                  >
                    {prompt}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <div className="space-y-3 px-2 py-2">
                  <ResponseDepthControl
                    idPrefix="my-ai-composer-depth"
                    value={responseDepth}
                    onChange={onResponseDepthChange}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="my-ai-composer-outside" className="text-xs font-normal">
                      Outside knowledge
                    </Label>
                    <Switch
                      id="my-ai-composer-outside"
                      checked={includeGeneral}
                      onCheckedChange={(v) => onIncludeGeneralChange(Boolean(v))}
                    />
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex shrink-0 items-center gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-0.5 rounded-full px-2 text-xs font-medium text-muted-foreground hover:bg-black/[0.04] dark:hover:bg-white/10"
                    aria-label="Response depth"
                  >
                    {DEPTH_LABELS[responseDepth]}
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {(Object.keys(DEPTH_LABELS) as ResponseDepthSetting[]).map((mode) => (
                    <DropdownMenuItem
                      key={mode}
                      onClick={() => onResponseDepthChange(mode)}
                      className={cn(responseDepth === mode && "font-medium text-foreground")}
                    >
                      {DEPTH_LABELS[mode]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DictateButton
                ref={dictateRef}
                userId={userId}
                size="md"
                className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/10"
                onAppend={(chunk) => {
                  onInputChange((prev) => mergeDictatedText(prev, chunk));
                }}
                onInterim={setDictInterim}
              />

              <Button
                type="button"
                size="icon"
                className={cn(
                  "h-9 w-9 shrink-0 rounded-full transition-colors",
                  showStop
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : canSend
                      ? "bg-blue-600 text-white hover:bg-blue-600/90"
                      : "bg-transparent text-muted-foreground/40 hover:bg-black/[0.04] dark:hover:bg-white/10",
                )}
                disabled={!showStop && !canSend}
                onClick={showStop ? onStop : handleSend}
                aria-label={showStop ? "Stop generating" : "Send message"}
              >
                {showStop ? (
                  <Square className="h-3.5 w-3.5 fill-current" />
                ) : sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
                )}
              </Button>
            </div>
          </div>
        </div>

        {dictInterim.trim() ? (
          <p className="mt-1.5 px-2 text-[11px] italic leading-relaxed text-muted-foreground" aria-live="polite">
            {dictInterim}
          </p>
        ) : null}

        {onResearchScope ? (
          <MyAiResearchChips
            disabled={sending}
            onScope={onResearchScope}
            className="mt-2 justify-center sm:justify-start"
          />
        ) : null}

        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          My AI can make mistakes. Grounded in your framework when sources match.
        </p>
      </div>
    </div>
  );
}
