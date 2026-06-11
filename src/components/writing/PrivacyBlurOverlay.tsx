import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { splitTextForPrivacyBlur } from "@/lib/journal/privacyBlurTextSplit";

type PrivacyBlurOverlayProps = {
  text: string;
  caretIndex: number;
  scrollTop: number;
  className?: string;
  mirrorRef?: React.RefObject<HTMLDivElement | null>;
};

const BLUR_CLASS = "blur-[6px] select-none";

export function PrivacyBlurOverlay({
  text,
  caretIndex,
  scrollTop,
  className,
  mirrorRef,
}: PrivacyBlurOverlayProps) {
  const { blurred, visible, blurredAfter } = useMemo(
    () => splitTextForPrivacyBlur(text, caretIndex),
    [text, caretIndex],
  );

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
  "text-transparent caret-foreground selection:bg-primary/20 selection:text-transparent [-webkit-text-fill-color:transparent]";
