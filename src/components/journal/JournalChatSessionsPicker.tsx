import { Loader2, MessageCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type ChatSessionItem = {
  id: string;
  title: string | null;
  entry_at_ts: string;
};

type Props = {
  sessions: ChatSessionItem[];
  loading: boolean;
  activeId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  /** Desktop rail — omit trigger/sheet wrapper. */
  variant?: "rail" | "mobile-trigger";
};

function formatSessionDate(ts: string): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function SessionsList({
  sessions,
  loading,
  activeId,
  onSelect,
  onNew,
}: Omit<Props, "open" | "onOpenChange" | "variant">) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Chat sessions
        </span>
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={onNew}>
          <MessageCircle className="h-3.5 w-3.5" /> New
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground opacity-60" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No chat sessions yet.</p>
        ) : (
          <ul className="py-1">
            {sessions.map((s) => {
              const active = activeId === s.id;
              const title = s.title?.trim() || "Untitled";
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50",
                      active && "bg-muted/70",
                    )}
                    onClick={() => onSelect(s.id)}
                  >
                    <MessageSquare
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug line-clamp-2">{title}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {formatSessionDate(s.entry_at_ts)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function JournalChatSessionsPicker({
  sessions,
  loading,
  activeId,
  open,
  onOpenChange,
  onSelect,
  onNew,
  variant = "mobile-trigger",
}: Props) {
  if (variant === "rail") {
    return (
      <div className="h-full min-h-0 border-r border-border bg-card/80 backdrop-blur-sm">
        <SessionsList
          sessions={sessions}
          loading={loading}
          activeId={activeId}
          onSelect={onSelect}
          onNew={onNew}
        />
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 shrink-0 gap-1.5 px-2.5 text-xs md:hidden"
          aria-label="Open chat sessions"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="max-w-[5rem] truncate">Sessions</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[min(72dvh,520px)] rounded-t-2xl p-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Chat sessions</SheetTitle>
        </SheetHeader>
        <SessionsList
          sessions={sessions}
          loading={loading}
          activeId={activeId}
          onSelect={onSelect}
          onNew={onNew}
        />
      </SheetContent>
    </Sheet>
  );
}
