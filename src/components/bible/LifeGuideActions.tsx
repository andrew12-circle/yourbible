import { Link } from "react-router-dom";
import { ClipboardList, Loader2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  saveBusy: "journal" | "playbook" | null;
  journalEntryId: string | null;
  playbookId: string | null;
  onSaveJournal: () => void;
  onSavePlaybook: () => void;
  disabled?: boolean;
}

export function LifeGuideActions({
  saveBusy,
  journalEntryId,
  playbookId,
  onSaveJournal,
  onSavePlaybook,
  disabled,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {journalEntryId ? (
        <Button variant="outline" size="sm" asChild>
          <Link to={`/journal/${journalEntryId}`}>
            <NotebookPen className="w-4 h-4 mr-1.5" aria-hidden />
            Open journal entry
          </Link>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onSaveJournal}
          disabled={disabled || saveBusy != null}
        >
          {saveBusy === "journal" ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" aria-hidden />
          ) : (
            <NotebookPen className="w-4 h-4 mr-1.5" aria-hidden />
          )}
          Save to journal
        </Button>
      )}

      {playbookId ? (
        <Button variant="outline" size="sm" asChild>
          <Link to={`/framework/playbook/${playbookId}`}>
            <ClipboardList className="w-4 h-4 mr-1.5" aria-hidden />
            Open playbook
          </Link>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onSavePlaybook}
          disabled={disabled || saveBusy != null}
        >
          {saveBusy === "playbook" ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" aria-hidden />
          ) : (
            <ClipboardList className="w-4 h-4 mr-1.5" aria-hidden />
          )}
          Add to playbook
        </Button>
      )}
    </div>
  );
}
