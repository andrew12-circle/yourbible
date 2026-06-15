import { useLayoutEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { applyTextareaMirrorStyles } from "@/lib/journal/textareaMirrorStyles";
import { splitTextForPrivacyBlur } from "@/lib/journal/privacyBlurTextSplit";

type PrivacyBlurOverlayProps = {
  text: string;
  caretIndex: number;
  scrollTop: number;
  className?: string;
  mirrorRef?: React.RefObject<HTMLDivElement | null>;
  fieldRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
};

const BLUR_CLASS = "blur-[6px] select-none";

export function PrivacyBlurOverlay({
  text,
  caretIndex,
  scrollTop,
  className,
  mirrorRef,
  fieldRef,
}: PrivacyBlurOverlayProps) {
  const { blurred, visible, blurredAfter } = useMemo(
    () => splitTextForPrivacyBlur(text, caretIndex),
    [text, caretIndex],
  );

  useLayoutEffect(() => {
    const field = fieldRef?.current;
    const mirror = mirrorRef?.current;
    if (!field || !mirror) return;
    applyTextareaMirrorStyles(field, mirror);
  }, [text, caretIndex, scrollTop, fieldRef, mirrorRef]);

  return (
    <div
      ref={mirrorRef}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 min-h-full overflow-hidden whitespace-pre-wrap break-words text-foreground",
        className,
      )}
    >
      <div style={{ transform: `translateY(-${scrollTop}px)` }}>
        {blurred ? <span className={BLUR_CLASS}>{blurred}</span> : null}
        <span>{visible}</span>
        {blurredAfter ? <span className={BLUR_CLASS}>{blurredAfter}</span> : null}
      </div>
    </div>
  );
}

export const PRIVACY_BLUR_FIELD_CLASS =
  "privacy-blur-field journal-plain-write-field text-transparent caret-foreground selection:bg-primary/20 selection:text-transparent [-webkit-text-fill-color:transparent]";
