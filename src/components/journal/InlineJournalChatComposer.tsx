import { useRef, type ReactNode } from "react";
import {
  Image as ImageIcon,
  Loader2,
  PenLine,
  Plus,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ResponseDepthControl from "@/components/journal/ResponseDepthControl";
import {
  JOURNAL_CHAT_TEXTAREA_LINE_HEIGHT_PX,
  JOURNAL_CHAT_TEXTAREA_VERTICAL_PADDING_PX,
  textareaHeightForLines,
  useAutoGrowTextarea,
} from "@/hooks/useAutoGrowTextarea";
import { privacyBlurMirrorClass, usePrivacyBlurField } from "@/hooks/usePrivacyBlurField";
import { PrivacyBlurOverlay } from "@/components/writing/PrivacyBlurOverlay";
import type { ResponseDepthSetting } from "@/lib/journal/responseDepth";
import { cn } from "@/lib/utils";

const JOURNAL_CHAT_TEXTAREA_HEIGHT = {
  lineHeightPx: JOURNAL_CHAT_TEXTAREA_LINE_HEIGHT_PX,
  verticalPaddingPx: JOURNAL_CHAT_TEXTAREA_VERTICAL_PADDING_PX,
};
const MIN_HEIGHT_PX = textareaHeightForLines(1, JOURNAL_CHAT_TEXTAREA_HEIGHT);
const MAX_HEIGHT_PX = textareaHeightForLines(8, JOURNAL_CHAT_TEXTAREA_HEIGHT);

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onExit: () => void;
  dictateControl?: ReactNode;
  onFocus?: () => void;
  onBlur?: () => void;
  onPointerDown?: () => void;
  aiBusy?: boolean;
  className?: string;
  rounded?: "pill" | "card";
  extraActions?: ReactNode;
  onAttachPhotos?: () => void;
  onHandwritten?: () => void;
  includeGeneral?: boolean;
  onIncludeGeneralChange?: (value: boolean) => void;
  responseDepth?: ResponseDepthSetting;
  onResponseDepthChange?: (value: ResponseDepthSetting) => void;
  onOpenInMyAi?: () => void;
};

export default function InlineJournalChatComposer({
  value,
  onChange,
  onSend,
  onExit,
  dictateControl,
  onFocus,
  onBlur,
  onPointerDown,
  aiBusy = false,
  className,
  rounded = "pill",
  extraActions,
  onAttachPhotos,
  onHandwritten,
  includeGeneral,
  onIncludeGeneralChange,
  responseDepth,
  onResponseDepthChange,
  onOpenInMyAi,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  useAutoGrowTextarea(taRef, value, { maxLines: 8, minLines: 1, ...JOURNAL_CHAT_TEXTAREA_HEIGHT });

  const textareaClassName =
    "!min-h-0 flex-1 resize-none overflow-hidden border-0 bg-transparent px-1 py-2 text-[13px] leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.2)_transparent]";

  const {
    privacyBlurEnabled,
    fieldClassName,
    bindPrivacyBlurHandlers,
    setCombinedRef,
    overlayProps,
  } = usePrivacyBlurField({
    value,
    mirrorClassName: privacyBlurMirrorClass(textareaClassName),
  });

  const privacyHandlers = bindPrivacyBlurHandlers({
    onChange: (e) => onChange(e.target.value),
    onFocus: () => onFocus?.(),
    onBlur: () => onBlur?.(),
  });

  const setRefs = (el: HTMLTextAreaElement | null) => {
    setCombinedRef(el);
    taRef.current = el;
  };

  const shellClass =
    rounded === "pill"
      ? "flex items-end gap-2 rounded-[28px] border border-border bg-background px-2 py-1.5 shadow-sm"
      : "flex items-end gap-2 rounded-xl border border-border bg-muted/30 px-2 py-2";

  const showOptions =
    onAttachPhotos ||
    onHandwritten ||
    onIncludeGeneralChange ||
    onResponseDepthChange ||
    onOpenInMyAi;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className={shellClass}>
        {showOptions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Add and chat options"
                disabled={aiBusy}
              >
                <Plus className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72 max-w-[calc(100vw-2rem)]">
              <DropdownMenuItem onClick={onExit}>
                Back to writing
              </DropdownMenuItem>
              {onAttachPhotos ? (
                <DropdownMenuItem onClick={onAttachPhotos} disabled={aiBusy}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Attach photos
                </DropdownMenuItem>
              ) : null}
              {onHandwritten ? (
                <DropdownMenuItem onClick={onHandwritten} disabled={aiBusy}>
                  <PenLine className="mr-2 h-4 w-4" />
                  Handwritten note
                </DropdownMenuItem>
              ) : null}
              {onOpenInMyAi ? (
                <DropdownMenuItem onClick={onOpenInMyAi}>
                  Open in My AI
                </DropdownMenuItem>
              ) : null}
              {(onIncludeGeneralChange || onResponseDepthChange) && (
                <>
                  <DropdownMenuSeparator />
                  {onResponseDepthChange && responseDepth ? (
                    <div className="space-y-3 px-2 py-2">
                      <ResponseDepthControl
                        idPrefix="inline-journal-chat-depth"
                        value={responseDepth}
                        onChange={onResponseDepthChange}
                      />
                    </div>
                  ) : null}
                  {onIncludeGeneralChange ? (
                    <div className="space-y-2 px-2 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="inline-journal-chat-outside" className="text-xs font-normal">
                          Outside knowledge
                        </Label>
                        <Switch
                          id="inline-journal-chat-outside"
                          checked={includeGeneral ?? false}
                          onCheckedChange={(v) => onIncludeGeneralChange(Boolean(v))}
                        />
                      </div>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        Opt in when your framework does not cover the topic. When off, replies stay anchored to your
                        journal, beliefs, and living context.
                      </p>
                    </div>
                  ) : null}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <button
            type="button"
            onClick={onExit}
            className="h-9 w-9 shrink-0 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Back to writing"
          >
            <Plus className="h-5 w-5 rotate-45" />
          </button>
        )}
        <div className="relative min-w-0 flex-1">
          {overlayProps ? <PrivacyBlurOverlay {...overlayProps} /> : null}
          <Textarea
            ref={setRefs}
            value={value}
            onPointerDown={onPointerDown}
            {...privacyHandlers}
            rows={1}
            placeholder={aiBusy ? "Thinking…" : "Message"}
            style={{ minHeight: MIN_HEIGHT_PX, maxHeight: MAX_HEIGHT_PX }}
            className={cn(
              textareaClassName,
              fieldClassName,
              privacyBlurEnabled && "relative z-[1]",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
        </div>
        {dictateControl}
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
      {extraActions ? <div className="flex justify-end px-1">{extraActions}</div> : null}
    </div>
  );
}
