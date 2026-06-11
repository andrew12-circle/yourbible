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

export function PrivacyBlurOverlay({
  text,
  caretIndex,
  scrollTop,
  className,
  mirrorRef,
}: PrivacyBlurOverlayProps) {
  const { blurred, visible } = useMemo(
    () => splitTextForPrivacyBlur(text, caretIndex),
    [text, caretIndex],
  );

  return (
    <div
      ref={mirrorRef}
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words",
        className,
      )}
      style={{ scrollBehavior: "auto" }}
    >
      <div style={{ transform: `translateY(-${scrollTop}px)` }}>
        {blurred ? <span className="blur-[6px] select-none">{blurred}</span> : null}
        <span>{visible}</span>
      </div>
    </div>
  );
}

export const PRIVACY_BLUR_FIELD_CLASS =
  "text-transparent caret-foreground selection:bg-primary/20 selection:text-transparent";
