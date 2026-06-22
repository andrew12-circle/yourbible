import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { classifyJournalSaveCryptoError, journalSaveCryptoErrorMessage } from "@/lib/journal/journalE2ePolicy";

type Props = {
  journalId: string | null | undefined;
};

/** Shown when composing in the Private notebook without encryption ready. */
export function PrivateJournalCryptoBanner({ journalId }: Props) {
  const block = classifyJournalSaveCryptoError(journalId);
  if (!block) return null;

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm flex gap-3 items-start">
      <Lock className="h-4 w-4 shrink-0 mt-0.5 text-amber-800 dark:text-amber-200" aria-hidden />
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-amber-950 dark:text-amber-50">Private journal — encryption required</p>
        <p className="text-muted-foreground text-xs leading-relaxed">{journalSaveCryptoErrorMessage(block)}</p>
        <Link to="/settings?section=privacy" className="text-xs font-medium text-primary hover:underline">
          Open journal privacy settings
        </Link>
      </div>
    </div>
  );
}
