import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SquarePen, MoreHorizontal, Download, Loader2, FileUp } from "lucide-react";
import DayOneImportDialog from "@/components/journal/DayOneImportDialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import JournalsRail from "./JournalsRail";
import JournalCover from "./JournalCover";
import { Journal, ensureDefaultJournal } from "@/lib/journal/journals";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportJournalAsZip } from "@/lib/journal/export";
import { toast } from "@/hooks/use-toast";
import JournalPrivacyBlurToggle from "@/components/journal/JournalPrivacyBlurToggle";

interface Props {
  /** Currently scoped journal (null = aggregate). */
  journalId: string | null;
  /** Tab key for the cover. */
  activeTab: "list" | "calendar" | "media" | "map" | "graph";
  /** Subtitle override. Default: derived year range. */
  subtitle?: string;
  children: ReactNode;
  /** Override entry-count subtitle for "All Entries". */
  totalCount?: number;
  /** Override cover title (default: journal name or "All Entries"). */
  coverTitle?: string;
  /** Mobile cover back link (default /home). */
  backTo?: string;
  /** FAB "new entry" URL (default `/journal/new` with optional journalId). */
  composeHref?: string;
  /** Hide List/Calendar/Media/Map/Graph tabs (utility pages like Today, Mirror). */
  showTabs?: boolean;
  /** Hide the floating compose button. */
  hideComposeFab?: boolean;
  /** Override cover header actions (export menu, etc.). */
  headerRight?: ReactNode;
}

export default function JournalShell({
  journalId,
  activeTab,
  subtitle,
  children,
  totalCount,
  coverTitle,
  backTo,
  composeHref,
  showTabs = true,
  hideComposeFab = false,
  headerRight,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [yearRange, setYearRange] = useState<string | undefined>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dayOneImportOpen, setDayOneImportOpen] = useState(false);

  const reload = async () => {
    if (!user) return;
    const list = await ensureDefaultJournal(user.id);
    setJournals(list);
  };

  useEffect(() => {
    reload();
  }, [user]);

  // Compute year range for cover subtitle
  useEffect(() => {
    if (subtitle !== undefined || !user) return;
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const baseFirst = supabase.from("journal_entries").select("entry_at_ts");
      const baseLast = supabase.from("journal_entries").select("entry_at_ts");
      const firstQ = journalId ? baseFirst.eq("journal_id", journalId) : baseFirst;
      const lastQ = journalId ? baseLast.eq("journal_id", journalId) : baseLast;
      const [{ data: firstData }, { data: lastData }] = await Promise.all([
        firstQ.order("entry_at_ts", { ascending: true }).limit(1),
        lastQ.order("entry_at_ts", { ascending: false }).limit(1),
      ]);
      const first = firstData?.[0]?.entry_at_ts;
      const last = lastData?.[0]?.entry_at_ts;
      if (first && last) {
        const fy = new Date(first).getFullYear();
        const ly = new Date(last).getFullYear();
        setYearRange(fy === ly ? `${fy}` : `${fy} – ${ly}`);
      } else {
        setYearRange(undefined);
      }
    })();
  }, [journalId, user, subtitle]);

  const journal = journals.find((j) => j.id === journalId) ?? null;

  const onExport = async () => {
    setExporting(true);
    try {
      const n = await exportJournalAsZip(journal);
      toast({ title: `Exported ${n} ${n === 1 ? "entry" : "entries"}` });
    } catch (e) {
      toast({ title: "Export failed", description: String(e), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const tabBase = journalId ? `/journal/j/${journalId}` : "/journal";
  const tabs = showTabs
    ? [
        { key: "list", label: "List", to: tabBase, active: activeTab === "list" },
        {
          key: "calendar",
          label: "Calendar",
          to: `${tabBase}/calendar`,
          active: activeTab === "calendar",
        },
        { key: "media", label: "Media", to: `${tabBase}/media`, active: activeTab === "media" },
        { key: "map", label: "Map", to: `${tabBase}/map`, active: activeTab === "map" },
        { key: "graph", label: "Graph", to: `${tabBase}/graph`, active: activeTab === "graph" },
      ]
    : undefined;

  const defaultHeaderRight = (
    <div className="flex items-center gap-2">
      <JournalPrivacyBlurToggle tone="onCover" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2 rounded-full hover:bg-white/15"
            aria-label="More"
          >
            {exporting ? (
              <Loader2 className="w-[20px] h-[20px] animate-spin" />
            ) : (
              <MoreHorizontal className="w-[22px] h-[22px]" strokeWidth={2.2} />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDayOneImportOpen(true)}>
            <FileUp className="w-4 h-4 mr-2" />
            Import from Day One
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExport} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            Export as Markdown (.zip)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const sub =
    subtitle ??
    (totalCount != null
      ? `${totalCount} ${totalCount === 1 ? "entry" : "entries"}`
      : yearRange);

  const fabColor = journal ? `hsl(${journal.color})` : "hsl(211 100% 50%)";

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="flex">
        <div className="hidden md:block w-72 border-r border-border/60 bg-muted/20 flex-shrink-0 h-screen sticky top-0 overflow-y-auto">
          <JournalsRail
            journals={journals}
            activeJournalId={journalId}
            onChange={reload}
          />
        </div>
        {/* Mobile rail in sheet */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="left" className="p-0 w-72">
            <JournalsRail
              journals={journals}
              activeJournalId={journalId}
              onChange={reload}
              inSheet
            />
          </SheetContent>
        </Sheet>

        <div className="flex-1 min-w-0">
          <JournalCover
            journal={journal}
            titleOverride={coverTitle}
            subtitle={sub}
            tabs={tabs}
            onOpenRail={() => setSheetOpen(true)}
            backTo={backTo}
            right={headerRight ?? defaultHeaderRight}
          />
          <main className="pb-[calc(8rem+var(--safe-area-inset-bottom))]">{children}</main>
        </div>
      </div>

      {/* Floating compose */}
      {!hideComposeFab && (
      <button
        onClick={() =>
          navigate(
            composeHref ??
              `/journal/new${journalId ? `?journalId=${journalId}` : ""}`,
          )
        }
        className="fixed bottom-[calc(var(--safe-area-inset-bottom)+1.75rem)] right-7 w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform z-40"
        style={{ background: fabColor, boxShadow: `0 12px 28px -8px ${fabColor}` }}
        aria-label="New entry"
      >
        <SquarePen className="w-6 h-6" strokeWidth={2.2} />
      </button>
      )}

      <DayOneImportDialog
        open={dayOneImportOpen}
        onOpenChange={setDayOneImportOpen}
        journals={journals}
        defaultJournalId={journalId}
        onImported={(id) => {
          void reload();
          if (id) navigate(`/journal/j/${id}`);
        }}
      />
    </div>
  );
}
