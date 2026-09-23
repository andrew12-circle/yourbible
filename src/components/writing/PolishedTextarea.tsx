import { supabase } from "@/integrations/supabase/client";
import { canUseJournalCloudAi } from "@/lib/journal/journalAiAccess";
import { preserveJournalAiEdit, loadJournalAiEdits } from "@/lib/journal/journalDraftStorage";
import * as React from "react";
import { Loader2 } from "lucide-react";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useJournalCloudAiPermission, useJournalAiDocument } from "@/components/journal/JournalAiPrivacy";
import { MAX_POLISH_CHARS } from "@/lib/ai/safePolish";
import { mergeJournalText } from "@/lib/journal/journalTextMerge";
import { polishText } from "@/lib/ai/polishText";
import { useAiWritingAssistStore } from "@/lib/aiWritingAssistStore";
import { mapCursorAfterEdit } from "@/lib/editor/mapCursorAfterEdit";
import { privacyBlurMirrorClass, usePrivacyBlurField } from "@/hooks/usePrivacyBlurField";
import { PrivacyBlurOverlay } from "@/components/writing/PrivacyBlurOverlay";

const MIN_POLISH_CHARS = 12;
const DEFAULT_IDLE_MS = 2000;
const WORD_POLISH_MS = 500;
const WORD_BOUNDARY = /[\s.,!?;:'")\]\n]/;

export type PolishedTextareaProps = Omit<TextareaProps, "value" | "onChange" | "spellCheck"> & {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Wrapper around the textarea (e.g. flex-1 under pinned video journal). */
  wrapperClassName?: string;
  polishFieldKey?: string;
  /** When AI assist is on, also polish after this many ms with no edits (default 2000). */
  idleDebounceMs?: number;
  enableIdlePolish?: boolean;
  /** When AI assist is on, polish shortly after a word boundary (space, punctuation). */
  enableWordPolish?: boolean;
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
      enableWordPolish = true,
      polishResetKey,
      className,
      wrapperClassName,
      polishFieldKey = "body",
      disabled,
      onFocus,
      onBlur,
      onAfterBlurAssist,
      allowAiPolish = true,
      ...rest
    },
    ref,
  ) => {
    const aiWritingAssistEnabled = useAiWritingAssistStore((s) => s.aiWritingAssistEnabled);
    const journalDocument = useJournalAiDocument();
    const cloudAllowed = useJournalCloudAiPermission() && allowAiPolish && !disabled;
    const latestPermission = React.useRef(cloudAllowed);
    latestPermission.current = cloudAllowed;
    const requestGeneration = React.useRef(0);
    const requestAbort = React.useRef<AbortController | null>(null);
    const identity = React.useRef(polishResetKey);
    if (identity.current !== polishResetKey) {
      identity.current = polishResetKey;
      requestGeneration.current += 1;
      requestAbort.current?.abort();
    }
    const [aiHistory, setAiHistory] = React.useState<{ before: string; after: string; key: typeof polishResetKey }[]>([]);
    const valueRef = React.useRef(value);
    valueRef.current = value;

    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const lastPolishedRef = React.useRef<string | null>(null);
    const wordPolishTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [polishing, setPolishing] = React.useState(false);

    React.useEffect(() => {
      let cancelled = false;
      lastPolishedRef.current = null;
      setAiHistory([]);
      if (journalDocument && cloudAllowed) {
        void supabase.auth.getSession().then(async ({ data }) => {
          if (!data.session || cancelled) return;
          const edits = await loadJournalAiEdits(data.session.user.id, journalDocument, polishFieldKey);
          if (!cancelled) setAiHistory(edits.filter((edit) => edit.before !== valueRef.current).map((edit) => ({ before: edit.before, after: edit.after, key: polishResetKey })));
        }).catch(() => {});
      }
      return () => { cancelled = true; };
    }, [polishResetKey, journalDocument, polishFieldKey, cloudAllowed]);

    React.useEffect(() => {
      if (!cloudAllowed) {
        requestGeneration.current += 1;
        requestAbort.current?.abort();
        setPolishing(false);
        setAiHistory([]);
      }
      return () => { requestGeneration.current += 1; requestAbort.current?.abort(); };
    }, [cloudAllowed]);

    React.useEffect(() => {
      return () => {
        if (wordPolishTimerRef.current) clearTimeout(wordPolishTimerRef.current);
      };
    }, []);

    const applyPolishedValue = React.useCallback(
      (snapshot: string, out: string) => {
        const el = textareaRef.current;
        const cursor = el?.selectionStart ?? snapshot.length;
        const selectionEnd = el?.selectionEnd ?? cursor;

        // Keep the complete original before any AI replacement. Undo is field-scoped.
        setAiHistory((history) => [...history.slice(-19), { before: snapshot, after: out, key: polishResetKey }]);
        onChange({
          target: { value: out },
          currentTarget: { value: out },
        } as React.ChangeEvent<HTMLTextAreaElement>);
        valueRef.current = out;

        if (!el) return;
        const nextStart = mapCursorAfterEdit(snapshot, out, cursor);
        const nextEnd = mapCursorAfterEdit(snapshot, out, selectionEnd);
        requestAnimationFrame(() => {
          if (document.activeElement === el) {
            el.setSelectionRange(nextStart, nextEnd);
          }
        });
      },
      [onChange, polishResetKey],
    );

    const runPolish = React.useCallback(
      async (snapshot: string) => {
        if (!latestPermission.current || useAiWritingAssistStore.getState().polishUnavailable || snapshot.length > MAX_POLISH_CHARS) return;
        if (!useAiWritingAssistStore.getState().aiWritingAssistEnabled || disabled) return;
        const t = snapshot.trim();
        if (t.length < MIN_POLISH_CHARS) return;
        if (snapshot === lastPolishedRef.current) return;
        requestAbort.current?.abort();
        const controller = new AbortController();
        requestAbort.current = controller;
        const generation = ++requestGeneration.current;
        const sourceKey = identity.current;
        setPolishing(true);
        try {
          let requestOwner: string | undefined;
          if (journalDocument) {
            const session = await supabase.auth.getSession();
            requestOwner = session.data.session?.user.id;
            if (session.error || !requestOwner || !(await canUseJournalCloudAi(journalDocument, requestOwner))) return;
          }
          if (controller.signal.aborted || generation !== requestGeneration.current) return;
          const out = await polishText(snapshot, controller.signal, journalDocument);
          if (controller.signal.aborted || generation !== requestGeneration.current || sourceKey !== identity.current
            || !latestPermission.current || valueRef.current !== snapshot) return;
          lastPolishedRef.current = out;
          if (out !== snapshot) {
            if (journalDocument) {
              const { data, error } = await supabase.auth.getSession();
              if (error || !data.session || data.session.user.id !== requestOwner) return;
              await preserveJournalAiEdit(data.session.user.id, journalDocument, polishFieldKey, snapshot, out);
              if (controller.signal.aborted || generation !== requestGeneration.current || !latestPermission.current || valueRef.current !== snapshot) return;
            }
            applyPolishedValue(snapshot, out);
          }
        } catch {
          // Background polish is optional — fail quietly and stop retrying.
          if (!controller.signal.aborted && generation === requestGeneration.current) useAiWritingAssistStore.getState().markPolishUnavailable();
        } finally {
          if (generation === requestGeneration.current) setPolishing(false);
        }
      },
      [allowAiPolish, applyPolishedValue, disabled, journalDocument, polishFieldKey],
    );

    const scheduleWordPolish = React.useCallback(() => {
      if (!allowAiPolish || !enableWordPolish || disabled) return;
      if (!useAiWritingAssistStore.getState().aiWritingAssistEnabled) return;
      if (wordPolishTimerRef.current) clearTimeout(wordPolishTimerRef.current);
      wordPolishTimerRef.current = setTimeout(() => {
        wordPolishTimerRef.current = null;
        const v = valueRef.current;
        if (v.trim().length < MIN_POLISH_CHARS) return;
        if (v === lastPolishedRef.current) return;
        void runPolish(v);
      }, WORD_POLISH_MS);
    }, [allowAiPolish, disabled, enableWordPolish, runPolish]);

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

    const handleBlur: React.FocusEventHandler<HTMLTextAreaElement> = async (e) => {
      if (wordPolishTimerRef.current) {
        clearTimeout(wordPolishTimerRef.current);
        wordPolishTimerRef.current = null;
      }
      if (allowAiPolish && useAiWritingAssistStore.getState().aiWritingAssistEnabled && !disabled) {
        await runPolish(valueRef.current);
      }
      onBlur?.(e);
      onAfterBlurAssist?.(valueRef.current);
    };

    const {
      privacyBlurEnabled,
      fieldClassName,
      bindPrivacyBlurHandlers,
      setCombinedRef,
      overlayProps,
    } = usePrivacyBlurField({
      value,
      mirrorClassName: privacyBlurMirrorClass(className),
    });

    const privacyHandlers = bindPrivacyBlurHandlers({
      onChange: (e) => {
        requestGeneration.current += 1;
        requestAbort.current?.abort();
        setPolishing(false);
        onChange(e as React.ChangeEvent<HTMLTextAreaElement>);
        const next = e.target.value;
        valueRef.current = next;
        const pos = e.target.selectionStart ?? next.length;
        const charBefore = pos > 0 ? next[pos - 1] : "";
        if (next.trim().length >= MIN_POLISH_CHARS && WORD_BOUNDARY.test(charBefore)) {
          scheduleWordPolish();
        }
      },
      onBlur: handleBlur,
      onFocus,
    });

    const setRefs = (el: HTMLTextAreaElement | null) => {
      textareaRef.current = el;
      setCombinedRef(el);
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    };

    return (
      <div className={cn("relative", wrapperClassName)}>
        {overlayProps ? <PrivacyBlurOverlay {...overlayProps} /> : null}
        <Textarea
          {...rest}
          {...privacyHandlers}
          ref={setRefs}
          value={value}
          spellCheck
          autoCorrect="on"
          autoCapitalize="sentences"
          disabled={disabled}
          className={cn(
            className,
            fieldClassName,
            privacyBlurEnabled && "relative z-[1] bg-transparent",
            polishing && "opacity-[0.92]",
          )}
        />
        {aiHistory.length > 0 && aiHistory[aiHistory.length - 1].key === polishResetKey && cloudAllowed && (
          <button type="button" className="mt-1 text-xs text-muted-foreground underline" onClick={() => {
            const edit = aiHistory[aiHistory.length - 1];
            const current = valueRef.current;
            const restored = mergeJournalText(edit.after, current, edit.before);
            if (restored === null && !window.confirm("Restore the original text before this AI edit? This replaces later edits in this field too.")) return;
            const next = restored ?? edit.before;
            requestGeneration.current += 1;
            requestAbort.current?.abort();
            setPolishing(false);
            lastPolishedRef.current = next;
            valueRef.current = next;
            onChange({ target: { value: next }, currentTarget: { value: next } } as React.ChangeEvent<HTMLTextAreaElement>);
            setAiHistory((history) => history.slice(0, -1));
          }}>Undo AI edit</button>
        )}
        {polishing && (
          <div
            className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm ring-1 ring-border/60"
            aria-live="polite"
          >
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            Fixing spelling…
          </div>
        )}
      </div>
    );
  },
);
PolishedTextarea.displayName = "PolishedTextarea";
