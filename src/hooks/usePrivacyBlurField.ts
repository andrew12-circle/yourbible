import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type UIEvent,
} from "react";
import { PRIVACY_BLUR_FIELD_CLASS } from "@/components/writing/PrivacyBlurOverlay";
import { useJournalPrivacyBlurStore } from "@/lib/journal/journalPrivacyBlurStore";
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

  const syncCaretFromField = useCallback((el: TextFieldElement | null) => {
    if (!el) return;
    setCaretIndex(el.selectionStart ?? value.length);
  }, [value.length]);

  const bindPrivacyBlurHandlers = useCallback(
    (handlers: PrivacyBlurHandlers = {}) => {
      const chain =
        <E,>(ours: (e: E) => void, theirs?: (e: E) => void) =>
        (e: E) => {
          ours(e);
          theirs?.(e);
        };

      return {
        onChange: chain((e: ChangeEvent<TextFieldElement>) => {
          const el = e.currentTarget;
          fieldRef.current = el;
          syncCaretFromField(el);
        }, handlers.onChange),
        onSelect: chain((e: React.SyntheticEvent<TextFieldElement>) => {
          syncCaretFromField(e.currentTarget);
        }, handlers.onSelect),
        onKeyUp: chain((e: KeyboardEvent<TextFieldElement>) => {
          syncCaretFromField(e.currentTarget);
        }, handlers.onKeyUp),
        onClick: chain((e: MouseEvent<TextFieldElement>) => {
          syncCaretFromField(e.currentTarget);
        }, handlers.onClick),
        onScroll: chain((e: UIEvent<TextFieldElement>) => {
          setScrollTop(e.currentTarget.scrollTop);
        }, handlers.onScroll),
        onFocus: chain((e: FocusEvent<TextFieldElement>) => {
          fieldRef.current = e.currentTarget;
          syncCaretFromField(e.currentTarget);
        }, handlers.onFocus),
        onBlur: handlers.onBlur,
      };
    },
    [syncCaretFromField],
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

export function privacyBlurMirrorClass(className?: string) {
  return cn(
    "border-0 bg-transparent px-0 py-0 shadow-none font-sans text-[16px] leading-relaxed",
    className,
  );
}
