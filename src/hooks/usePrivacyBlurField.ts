import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type UIEvent,
} from "react";
import { PRIVACY_BLUR_FIELD_CLASS } from "@/components/writing/PrivacyBlurOverlay";
import { useJournalPrivacyBlurStore } from "@/lib/journal/journalPrivacyBlurStore";
import { isIosWebKit } from "@/lib/youtube/platform";
import { cn } from "@/lib/utils";

type TextFieldElement = HTMLTextAreaElement | HTMLInputElement;

type PrivacyBlurHandlers = {
  onChange?: (e: React.ChangeEvent<TextFieldElement>) => void;
  onSelect?: (e: React.SyntheticEvent<TextFieldElement>) => void;
  onKeyUp?: (e: KeyboardEvent<TextFieldElement>) => void;
  onClick?: (e: MouseEvent<TextFieldElement>) => void;
  onScroll?: (e: UIEvent<TextFieldElement>) => void;
  onFocus?: (e: FocusEvent<TextFieldElement>) => void;
  onBlur?: (e: FocusEvent<TextFieldElement>) => void;
};

function readCaret(el: TextFieldElement): number {
  return el.selectionStart ?? el.value.length;
}

export function usePrivacyBlurField({
  value,
  mirrorClassName,
}: {
  value: string;
  mirrorClassName?: string;
}) {
  const privacyBlurEnabled = useJournalPrivacyBlurStore((s) => s.journalPrivacyBlurEnabled);
  const [caretIndex, setCaretIndex] = useState(value.length);
  const [scrollTop, setScrollTop] = useState(0);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const fieldRef = useRef<TextFieldElement | null>(null);
  const caretRafRef = useRef<number | null>(null);

  const syncCaretFromField = useCallback((el: TextFieldElement | null) => {
    if (!el) return;
    setCaretIndex(readCaret(el));
  }, []);

  const scheduleCaretSync = useCallback(
    (el: TextFieldElement) => {
      const sync = () => syncCaretFromField(el);

      sync();
      if (caretRafRef.current != null) {
        cancelAnimationFrame(caretRafRef.current);
      }

      // iOS WebKit often updates selectionStart after input/click — double-rAF helps.
      if (isIosWebKit()) {
        caretRafRef.current = requestAnimationFrame(() => {
          sync();
          caretRafRef.current = requestAnimationFrame(() => {
            caretRafRef.current = null;
            sync();
          });
        });
        return;
      }

      caretRafRef.current = requestAnimationFrame(() => {
        caretRafRef.current = null;
        sync();
      });
    },
    [syncCaretFromField],
  );

  useLayoutEffect(() => {
    if (!privacyBlurEnabled) return;
    const el = fieldRef.current;
    if (el) scheduleCaretSync(el);
  }, [value, privacyBlurEnabled, scheduleCaretSync]);

  useEffect(() => {
    if (!privacyBlurEnabled) return;

    const onSelectionChange = () => {
      const el = fieldRef.current;
      if (el && document.activeElement === el) {
        scheduleCaretSync(el);
      }
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", onSelectionChange);
      if (caretRafRef.current != null) {
        cancelAnimationFrame(caretRafRef.current);
      }
    };
  }, [privacyBlurEnabled, scheduleCaretSync]);

  const bindPrivacyBlurHandlers = useCallback(
    (handlers: PrivacyBlurHandlers = {}) => {
      const chain =
        <E,>(ours: (e: E) => void, theirs?: (e: E) => void) =>
        (e: E) => {
          ours(e);
          theirs?.(e);
        };

      return {
        onInput: chain((e: FormEvent<TextFieldElement>) => {
          scheduleCaretSync(e.currentTarget);
        }, undefined),
        onChange: chain((e: ChangeEvent<TextFieldElement>) => {
          const el = e.currentTarget;
          fieldRef.current = el;
          scheduleCaretSync(el);
        }, handlers.onChange),
        onSelect: chain((e: React.SyntheticEvent<TextFieldElement>) => {
          scheduleCaretSync(e.currentTarget);
        }, handlers.onSelect),
        onKeyUp: chain((e: KeyboardEvent<TextFieldElement>) => {
          scheduleCaretSync(e.currentTarget);
        }, handlers.onKeyUp),
        onClick: chain((e: MouseEvent<TextFieldElement>) => {
          scheduleCaretSync(e.currentTarget);
        }, handlers.onClick),
        onPointerUp: chain((e: PointerEvent<TextFieldElement>) => {
          scheduleCaretSync(e.currentTarget);
        }, undefined),
        onCompositionEnd: chain((e: CompositionEvent<TextFieldElement>) => {
          scheduleCaretSync(e.currentTarget);
        }, undefined),
        onScroll: chain((e: UIEvent<TextFieldElement>) => {
          setScrollTop(e.currentTarget.scrollTop);
        }, handlers.onScroll),
        onFocus: chain((e: FocusEvent<TextFieldElement>) => {
          fieldRef.current = e.currentTarget;
          scheduleCaretSync(e.currentTarget);
        }, handlers.onFocus),
        onBlur: handlers.onBlur,
      };
    },
    [scheduleCaretSync],
  );

  const setCombinedRef = useCallback(
    (el: TextFieldElement | null) => {
      fieldRef.current = el;
      if (el && privacyBlurEnabled) {
        syncCaretFromField(el);
        setScrollTop("scrollTop" in el ? el.scrollTop : 0);
      }
    },
    [privacyBlurEnabled, syncCaretFromField],
  );

  const overlayProps =
    privacyBlurEnabled && value
      ? {
          text: value,
          caretIndex,
          scrollTop,
          className: mirrorClassName,
          mirrorRef,
          fieldRef,
        }
      : null;

  return {
    privacyBlurEnabled,
    fieldClassName: privacyBlurEnabled ? PRIVACY_BLUR_FIELD_CLASS : undefined,
    bindPrivacyBlurHandlers,
    setCombinedRef,
    overlayProps,
  };
}

export function mergeFieldRefs<T extends TextFieldElement>(
  ...refs: Array<React.Ref<T> | undefined>
): (el: T | null) => void {
  return (el) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(el);
      else (ref as React.MutableRefObject<T | null>).current = el;
    }
  };
}

/** Mirror must match the field typography exactly — pass through the field className. */
export function privacyBlurMirrorClass(className?: string) {
  return cn(className);
}
