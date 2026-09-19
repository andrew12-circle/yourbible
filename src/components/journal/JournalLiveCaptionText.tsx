import { useRef } from "react";
import { useDictInterimBlurClass } from "@/lib/journal/dictInterimBlur";
import { useJournalCaptionFollow } from "@/hooks/useJournalCaptionFollow";
import { cn } from "@/lib/utils";

/** Render speech as journal prose, not notification/status chrome. */
export function JournalLiveCaptionText({ text, className }: { text: string; className?: string }) {
  const endRef = useRef<HTMLSpanElement>(null);
  const blurClass = useDictInterimBlurClass(className);
  useJournalCaptionFollow(endRef, text);
  return <div data-journal-live-caption role="region" aria-label="Live recording text" aria-live="off"
    className={cn(blurClass, "whitespace-pre-wrap break-words", !text && "hidden")}>
    {text}<span ref={endRef} data-journal-caption-caret aria-hidden="true"
      className="ml-0.5 inline-block h-[1em] w-px bg-current align-text-bottom" />
  </div>;
}
