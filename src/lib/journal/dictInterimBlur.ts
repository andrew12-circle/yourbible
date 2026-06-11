import { cn } from "@/lib/utils";
import { useJournalPrivacyBlurStore } from "@/lib/journal/journalPrivacyBlurStore";

/** Extra classes for live dictation preview lines when blur mode is on. */
export function useDictInterimBlurClass(className?: string) {
  const enabled = useJournalPrivacyBlurStore((s) => s.journalPrivacyBlurEnabled);
  return cn(className, enabled && "blur-md select-none");
}
