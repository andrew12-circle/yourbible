import * as React from "react";
import { Loader2 } from "lucide-react";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { polishText } from "@/lib/ai/polishText";
import { useAiWritingAssistStore } from "@/lib/aiWritingAssistStore";

const MIN_POLISH_CHARS = 12;
const DEFAULT_IDLE_MS = 2000;

export type PolishedTextareaProps = Omit<TextareaProps, "value" | "onChange" | "spellCheck"> & {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** When AI assist is on, also polish after this many ms with no edits (default 2000). */
  idleDebounceMs?: number;
  enableIdlePolish?: boolean;
  /** When this changes (e.g. new interview question), skip-guards reset so polish can run again. */
  polishResetKey?: string | number;
  /** When false, never calls the polish API (native spellcheck only). Use for privacy-sensitive surfaces (e.g. vents). */
  allowAiPolish?: boolean;
  /** Runs after blur (and after any polish when assist is on). Use for persisting the latest text. */
  onAfterBlurAssist?: (value: string) => void;
};

export const PolishedTextarea = React.forwardRef<HTMLTextAreaElement, PolishedTextareaProps>(
  (
    {
      value,
      onChange,
      idleDebounceMs = DEFAULT_IDLE_MS,
      enableIdlePolish = true,
      polishResetKey,
      className,
      disabled,
      onBlur,
      onAfterBlurAssist,
      allowAiPolish = true,
      ...rest
    },
    ref,
  ) => {
    const aiWritingAssistEnabled = useAiWritingAssistStore((s) => s.aiWritingAssistEnabled);
    const valueRef = React.useRef(value);
    valueRef.current = value;

    const lastPolishedRef = React.useRef<string | null>(null);
    const [polishing, setPolishing] = React.useState(false);

    React.useEffect(() => {
      lastPolishedRef.current = null;
    }, [polishResetKey]);

    const runPolish = React.useCallback(
      async (snapshot: string) => {
        if (!allowAiPolish) return;
        if (!useAiWritingAssistStore.getState().aiWritingAssistEnabled || disabled) return;
        const t = snapshot.trim();
        if (t.length < MIN_POLISH_CHARS) return;
        if (snapshot === lastPolishedRef.current) return;
        setPolishing(true);
        try {
          const out = await polishText(snapshot);
          if (valueRef.current !== snapshot) return;
          lastPolishedRef.current = out;
          if (out !== snapshot) {
            onChange({
              target: { value: out },
              currentTarget: { value: out },
            } as React.ChangeEvent<HTMLTextAreaElement>);
            valueRef.current = out;
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          toast({
            title: "Could not polish text",
            description: msg,
            variant: "destructive",
          });
        } finally {
          setPolishing(false);
        }
      },
      [allowAiPolish, disabled, onChange],
    );

    React.useEffect(() => {
      if (!allowAiPolish || !useAiWritingAssistStore.getState().aiWritingAssistEnabled || !enableIdlePolish || disabled) return;
      const id = window.setTimeout(() => {
        if (!allowAiPolish || !useAiWritingAssistStore.getState().aiWritingAssistEnabled) return;
        const v = valueRef.current;
        if (v.trim().length < MIN_POLISH_CHARS) return;
        if (v === lastPolishedRef.current) return;
        void runPolish(v);
      }, idleDebounceMs);
      return () => window.clearTimeout(id);
    }, [value, allowAiPolish, aiWritingAssistEnabled, enableIdlePolish, disabled, idleDebounceMs, runPolish]);

    const setRefs = (el: HTMLTextAreaElement | null) => {
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    };

    const handleBlur: React.FocusEventHandler<HTMLTextAreaElement> = async (e) => {
      if (allowAiPolish && useAiWritingAssistStore.getState().aiWritingAssistEnabled && !disabled) {
        await runPolish(valueRef.current);
      }
      onBlur?.(e);
      onAfterBlurAssist?.(valueRef.current);
    };

    return (
      <div className="relative">
        <Textarea
          {...rest}
          ref={setRefs}
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          spellCheck
          disabled={disabled}
          className={cn(className, polishing && "opacity-[0.92]")}
        />
        {polishing && (
          <div
            className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm ring-1 ring-border/60"
            aria-live="polite"
          >
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Polishing…
          </div>
        )}
      </div>
    );
  },
);
PolishedTextarea.displayName = "PolishedTextarea";
