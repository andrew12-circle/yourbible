import { Link } from "react-router-dom";
import { BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { journalNewEntryEditHref } from "@/lib/journal/entryNavigation";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = {
  entryId: string | null;
  busy: boolean;
  error?: string | null;
  onEnsureEntry: () => Promise<string | null>;
  returnTo: string;
  label: string;
  continueLabel?: string;
  variant?: "primary" | "optional";
  className?: string;
};

export function MorningFormulaJournalLink({
  entryId,
  busy,
  error,
  onEnsureEntry,
  returnTo,
  label,
  continueLabel = "Journal",
  variant = "primary",
  className,
}: Props) {
  const encodedReturn = encodeURIComponent(returnTo);
  const journalHref = entryId
    ? `${journalNewEntryEditHref(entryId)}?returnTo=${encodedReturn}&kind=morning_conversation`
    : null;

  if (journalHref) {
    return (
      <div className={className}>
        <Button
          className={variant === "primary" ? lh.btnPrimary : cn(lh.btnGhost, "h-10 px-3 text-[13px] font-medium")}
          variant={variant === "optional" ? "ghost" : undefined}
          asChild
        >
          <Link to={journalHref}>
            <BookOpen className="w-4 h-4 mr-2" />
            {continueLabel}
          </Link>
        </Button>
        {error ? <p className="text-[12px] text-destructive mt-2">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        className={variant === "primary" ? lh.btnPrimary : cn(lh.btnGhost, "h-10 px-3 text-[13px] font-medium")}
        variant={variant === "optional" ? "ghost" : undefined}
        disabled={busy}
        onClick={() => void onEnsureEntry()}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (
          <>
            <BookOpen className="w-4 h-4 mr-2" />
            {label}
          </>
        )}
      </Button>
      {error ? <p className="text-[12px] text-destructive mt-2">{error}</p> : null}
    </div>
  );
}
