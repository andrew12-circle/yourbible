import { NotebookPen, MessageSquare, Sparkles } from "lucide-react";
import { useCompanion, scopeRef } from "@/lib/reader/companionStore";
import { CompanionJournalTab } from "@/components/reader/CompanionJournalTab";
import { CompanionDialogueTab } from "@/components/reader/CompanionDialogueTab";
import { CompanionBeliefTab } from "@/components/reader/CompanionBeliefTab";

/** Embedded AI companion column — Scripture stays separate; AI references verse scope only. */
export function ReaderCompanionColumn() {
  const { tab, setTab, scope } = useCompanion();

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <div className="flex-shrink-0 border-b px-3 py-2 bg-paper-warm/40">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">AI insights</p>
        <p className="text-xs font-medium truncate ink-text">
          {scope ? scopeRef(scope) : "Select a verse to begin"}
        </p>
      </div>
      <div className="flex border-b border-paper-edge bg-paper flex-shrink-0">
        {(
          [
            { id: "journal", label: "Journal", icon: NotebookPen },
            { id: "dialogue", label: "Dialogue", icon: MessageSquare },
            { id: "belief", label: "Belief", icon: Sparkles },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors ${
                tab === t.id
                  ? "text-leather border-b-2 border-leather -mb-px"
                  : "text-muted-foreground hover:text-leather"
              }`}
            >
              <Icon className="w-3 h-3" />
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {!scope ? (
          <div className="p-4 text-sm text-muted-foreground leading-relaxed">
            AI content never modifies Scripture. It references the verses you select.
          </div>
        ) : tab === "journal" ? (
          <CompanionJournalTab />
        ) : tab === "dialogue" ? (
          <CompanionDialogueTab />
        ) : (
          <CompanionBeliefTab />
        )}
      </div>
    </div>
  );
}
