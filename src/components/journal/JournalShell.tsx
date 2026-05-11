import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SquarePen } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import JournalsRail from "./JournalsRail";
import JournalCover from "./JournalCover";
import { Journal, ensureDefaultJournal, listJournals } from "@/lib/journal/journals";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  /** Currently scoped journal (null = aggregate). */
  journalId: string | null;
  /** Tab key for the cover. */
  activeTab: "list" | "calendar" | "media" | "map";
  /** Subtitle override. Default: derived year range. */
  subtitle?: string;
  children: ReactNode;
  /** Override entry-count subtitle for "All Entries". */
  totalCount?: number;
}

export default function JournalShell({
  journalId,
  activeTab,
  subtitle,
  children,
  totalCount,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [yearRange, setYearRange] = useState<string | undefined>(undefined);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const tabBase = journalId ? `/journal/j/${journalId}` : "/journal";
  const tabs = [
    { key: "list", label: "List", to: tabBase, active: activeTab === "list" },
    {
      key: "calendar",
      label: "Calendar",
      to: `${tabBase}/calendar`,
      active: activeTab === "calendar",
    },
    { key: "media", label: "Media", to: `${tabBase}/media`, active: activeTab === "media" },
    { key: "map", label: "Map", to: `${tabBase}/map`, active: activeTab === "map" },
  ];

  const sub =
    subtitle ??
    (totalCount != null
      ? `${totalCount} ${totalCount === 1 ? "entry" : "entries"}`
      : yearRange);

  const fabColor = journal ? `hsl(${journal.color})` : "hsl(211 100% 50%)";

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <JournalsRail
          journals={journals}
          activeJournalId={journalId}
          onChange={reload}
        />
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
            subtitle={sub}
            tabs={tabs}
            onOpenRail={() => setSheetOpen(true)}
          />
          <main className="pb-32">{children}</main>
        </div>
      </div>

      {/* Floating compose */}
      <button
        onClick={() =>
          navigate(`/journal/new${journalId ? `?journalId=${journalId}` : ""}`)
        }
        className="fixed bottom-7 right-7 w-14 h-14 rounded-full text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform z-40"
        style={{ background: fabColor, boxShadow: `0 12px 28px -8px ${fabColor}` }}
        aria-label="New entry"
      >
        <SquarePen className="w-6 h-6" strokeWidth={2.2} />
      </button>
    </div>
  );
}