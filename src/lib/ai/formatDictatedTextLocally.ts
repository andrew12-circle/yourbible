/** @deprecated Import from @/lib/journal/dictationFormatter */
export { formatDictatedJournalText, formatDictatedJournalText as formatDictatedTextLocally } from "@/lib/journal/dictationFormatter";

import { formatDictatedJournalText } from "@/lib/journal/dictationFormatter";

/** Device-only dictation formatting — never calls AI or the network. */
export function formatDictationForJournal(text: string): string {
  return formatDictatedJournalText(text);
}
