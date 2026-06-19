import { useLayoutEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  measureFieldCaretRect,
  syncTextareaMirrorLayout,
  type TextFieldCaretRect,
} from "@/lib/journal/textareaMirrorStyles";
import { splitTextForPrivacyBlur } from "@/lib/journal/privacyBlurTextSplit";

type PrivacyBlurOverlayProps = {
  text: string;
  caretIndex: number;
  scrollTop: number;
  fieldFocused?: boolean;
  className?: string;
  mirrorRef?: React.RefObject<HTMLDivElement | null>;
  fieldRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
};

const BLUR_CLASS = "inline blur-[6px] select-none";

export function PrivacyBlurOverlay({
  text,
  caretIndex,
  scrollTop,
  fieldFocused = false,
  className,
  mirrorRef,
  fieldRef,
}: PrivacyBlurOverlayProps) {
  const { blurred, visible, blurredAfter } = useMemo(
    () => splitTextForPrivacyBlur(text, caretIndex),
    [text, caretIndex],
  );

  const [caretRect, setCaretRect] = useState<TextFieldCaretRect | null>(null);

  useLayoutEffect(() => {
    const field = fieldRef?.current;
    const mirror = mirrorRef?.current;
    if (!field || !mirror) return;

    const sync = () => {
      syncTextareaMirrorLayout(field, mirror);
      if (fieldFocused && document.activeElement === field) {
        setCaretRect(measureFieldCaretRect(field));
      } else {
        setCaretRect(null);
      }
    };

    sync();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    observer?.observe(field);
    window.addEventListener("resize", sync);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [text, caretIndex, scrollTop, fieldFocused, fieldRef, mirrorRef]);

  return (
    <div
      ref={mirrorRef}
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-[2] overflow-hidden whitespace-pre-wrap break-words text-foreground",
        className,
      )}
    >
      <div className="relative" style={{ transform: `translateY(-${scrollTop}px)` }}>
        {blurred ? <span className={BLUR_CLASS}>{blurred}</span> : null}
        <span>{visible}</span>
        {blurredAfter ? <span className={BLUR_CLASS}>{blurredAfter}</span> : null}
        {fieldFocused && caretRect ? (
          <span
            className="pointer-events-none absolute w-[2px] animate-caret-blink bg-foreground"
            style={{
              top: caretRect.top,
              left: caretRect.left,
              height: caretRect.height,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Hide native glyphs; overlay draws text + a positioned caret. */
export const PRIVACY_BLUR_FIELD_CLASS =
  "privacy-blur-field journal-plain-write-field text-transparent caret-transparent selection:bg-primary/20 selection:text-transparent [-webkit-text-fill-color:transparent]";
