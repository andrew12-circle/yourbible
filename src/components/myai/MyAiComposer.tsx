import { useRef, useState, useEffect, type Dispatch, type RefObject, type SetStateAction } from "react";
import {
  ArrowUp,
  AudioLines,
  BookOpen,
  Brain,
  ChevronDown,
  Globe,
  Loader2,
  Plus,
  Save,
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
import { composeLiveDictationDisplay, mergeDictatedText } from "@/hooks/useSpeechDictation";
import type { MyAiResearchScope } from "@/lib/myai/researchScope";
import {
  MY_AI_RESEARCH_SCOPE_HINTS,
  MY_AI_RESEARCH_SCOPE_LABELS,
} from "@/lib/myai/researchScope";
import {
  MY_AI_COMPANION_MODE_HINTS,
  MY_AI_COMPANION_MODE_LABELS,
  type MyAiCompanionMode,
} from "@/lib/myai/companionMode";
import { textareaHeightForLines, useAutoGrowTextarea } from "@/hooks/useAutoGrowTextarea";
import {
  myAiComposerColumn,
  myAiComposerPill,
  myAiComposerPillActive,
  myAiInputShell,
  myAiWelcomeGlowOrb,
  myAiWelcomeGlowShell,
} from "@/lib/myai/myAiTheme";
import { mobileBottomDockPadding, mobileBottomDockTransform } from "@/lib/shell/mobileShellClasses";
import type { ResponseDepthSetting } from "@/lib/journal/responseDepth";
import { cn } from "@/lib/utils";

const DEPTH_LABELS: Record<ResponseDepthSetting, string> = {
  auto: "Auto",
  reflect: "Brief",
  deep: "Deep",
};

const RESEARCH_SCOPE_ITEMS: {
  scope: MyAiResearchScope;
  icon: typeof BookOpen;
}[] = [
  { scope: "library", icon: BookOpen },
  { scope: "outside", icon: Sparkles },
  { scope: "web", icon: Globe },
];

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
  companionMode: MyAiCompanionMode;
  onCompanionModeChange: (value: MyAiCompanionMode) => void;
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
  voiceReplies?: boolean;
  onVoiceRepliesChange?: (value: boolean) => void;
  className?: string;
  welcomeQuickPrompts?: readonly string[];
  onWelcomeQuickPrompt?: (prompt: string) => void;
  /** Center in viewport (new chat); dock to bottom once a thread exists. */
  layout?: "center" | "dock";
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
  companionMode,
  onCompanionModeChange,
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
  voiceReplies = false,
  onVoiceRepliesChange,
  className,
  welcomeQuickPrompts,
  onWelcomeQuickPrompt,
  layout = "dock",
}: Props) {
  const isCentered = layout === "center";
  const localTaRef = useRef<HTMLTextAreaElement>(null);
  const taRef = externalTaRef ?? localTaRef;
  const dictateRef = useRef<DictateButtonHandle | null>(null);
  const [dictInterim, setDictInterim] = useState("");
  const [dictationListening, setDictationListening] = useState(false);

  const displayInput = composeLiveDictationDisplay(input, dictInterim);
  const canSend = Boolean(displayInput.trim()) && !sending;
  const showStop = sending && Boolean(onStop);

  useAutoGrowTextarea(taRef, displayInput, { maxLines: 6, minLines: 1 });

  useEffect(() => {
    if (!dictInterim) return;
    const el = taRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [displayInput, dictInterim, taRef]);

  const handleSend = () => {
    if (!canSend) return;
    dictateRef.current?.stop();
    const text = displayInput.trim();
    setDictInterim("");
    onInputChange(text);
    onSend(text);
  };

  const applyPrompt = (prompt: string) => {
    onSuggestedPrompt(prompt);
    requestAnimationFrame(() => taRef.current?.focus());
  };

  return (
    <div
      className={cn(
        isCentered
          ? "relative w-full"
          : "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background via-background/95 to-transparent px-3 pb-3 pt-8 sm:px-4",
        className,
      )}
      style={
        isCentered
          ? mobileBottomDockTransform(keyboardInset)
          : {
              ...mobileBottomDockPadding("0.75rem"),
              ...mobileBottomDockTransform(keyboardInset),
            }
      }
    >
      <div className={cn("pointer-events-auto", !isCentered && myAiComposerColumn, isCentered && "w-full")}>
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

        <div className={cn(isCentered && "relative")}>
          {isCentered ? (
            <div className={myAiWelcomeGlowShell} aria-hidden>
              <div className={myAiWelcomeGlowOrb} />
            </div>
          ) : null}

          <div className={cn(myAiInputShell, isCentered && "relative z-10")}>
          <Textarea
            ref={taRef}
            value={displayInput}
            onChange={(e) => {
              setDictInterim("");
              onInputChange(e.target.value);
            }}
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
            aria-live={dictationListening ? "polite" : undefined}
            placeholder={
              sending
                ? "Thinking…"
                : dictationListening
                  ? "Listening…"
                  : editingMessageId
                    ? "Edit message"
                    : "Ask anything"
            }
            style={{ minHeight: MIN_HEIGHT_PX, maxHeight: MAX_HEIGHT_PX }}
            className={cn(
              "!min-h-0 w-full resize-none overflow-hidden border-0 bg-transparent px-2 py-1.5",
              "text-base leading-snug shadow-none placeholder:text-muted-foreground/70 md:text-[13px]",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "[scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.2)_transparent]",
            )}
          />

          <div className="flex items-center justify-between gap-2 px-1 pb-0.5 pt-0">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    aria-label="Add and options"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 max-w-[calc(100vw-2rem)]">
                  {onResearchScope
                    ? RESEARCH_SCOPE_ITEMS.map(({ scope, icon: Icon }) => (
                        <DropdownMenuItem
                          key={scope}
                          disabled={sending}
                          title={MY_AI_RESEARCH_SCOPE_HINTS[scope]}
                          onClick={() => onResearchScope(scope)}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {MY_AI_RESEARCH_SCOPE_LABELS[scope]}
                        </DropdownMenuItem>
                      ))
                    : null}
                  {onResearchScope ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem onClick={onNewChat} disabled={sending}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    New chat
                  </DropdownMenuItem>
                  {canSaveJournal ? (
                    <DropdownMenuItem disabled={savingJournal || sending} onClick={onSaveJournal}>
                      <Save className="mr-2 h-4 w-4" />
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="my-ai-composer-inward" className="text-xs font-normal">
                          {MY_AI_COMPANION_MODE_LABELS.inward}
                        </Label>
                        <p className="text-[10px] leading-snug text-muted-foreground">
                          {MY_AI_COMPANION_MODE_HINTS.inward}
                        </p>
                      </div>
                      <Switch
                        id="my-ai-composer-inward"
                        checked={companionMode === "inward"}
                        onCheckedChange={(v) => onCompanionModeChange(v ? "inward" : "chatgpt")}
                      />
                    </div>
                    {companionMode === "inward" ? (
                      <>
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
                      </>
                    ) : (
                      <ResponseDepthControl
                        idPrefix="my-ai-composer-depth"
                        value={responseDepth}
                        onChange={onResponseDepthChange}
                      />
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                className={cn(
                  companionMode === "inward" ? myAiComposerPillActive : myAiComposerPill,
                )}
                aria-pressed={companionMode === "inward"}
                aria-label={MY_AI_COMPANION_MODE_LABELS.inward}
                title={MY_AI_COMPANION_MODE_HINTS.inward}
                onClick={() =>
                  onCompanionModeChange(companionMode === "inward" ? "chatgpt" : "inward")
                }
              >
                <Brain className="h-3 w-3 shrink-0" />
                Inward
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={myAiComposerPill} aria-label="Response depth">
                    {DEPTH_LABELS[responseDepth]}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
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
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <DictateButton
                ref={dictateRef}
                userId={userId}
                webSpeechOnly
                size="md"
                className={cn(
                  "h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  dictationListening && "text-primary",
                )}
                onAppend={(chunk) => {
                  onInputChange((prev) => mergeDictatedText(prev, chunk));
                }}
                onInterim={setDictInterim}
                onListeningChange={(listening) => {
                  setDictationListening(listening);
                  if (listening) {
                    requestAnimationFrame(() => taRef.current?.focus());
                  }
                }}
              />

              {onVoiceRepliesChange ? (
                <Button
                  type="button"
                  size="icon"
                  variant={voiceReplies ? "default" : "ghost"}
                  className={cn(
                    "h-9 w-9 shrink-0 rounded-full",
                    voiceReplies
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  )}
                  aria-label="Toggle voice replies"
                  aria-pressed={voiceReplies}
                  title="Read replies aloud"
                  onClick={() => onVoiceRepliesChange(!voiceReplies)}
                >
                  <AudioLines className="h-4 w-4" />
                </Button>
              ) : null}

              <Button
                type="button"
                size="icon"
                className={cn(
                  "h-9 w-9 shrink-0 rounded-full transition-colors",
                  showStop
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : canSend
                      ? "bg-blue-600 text-white hover:bg-blue-600/90"
                      : "bg-transparent text-muted-foreground/40 hover:bg-muted/80",
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
        </div>

        {welcomeQuickPrompts?.length && onWelcomeQuickPrompt ? (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {welcomeQuickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={sending}
                onClick={() => onWelcomeQuickPrompt(prompt)}
                className={cn(
                  "rounded-full border border-border/80 bg-background px-3.5 py-2 text-[13px] font-normal text-foreground",
                  "transition-colors hover:bg-muted/60 disabled:opacity-50",
                )}
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        {!welcomeQuickPrompts?.length ? (
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/70">
            {companionMode === "inward"
              ? "Inward companion — your library first, with citations when sources match."
              : "My AI can make mistakes. ChatGPT-style answers enriched with your library when relevant."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
