import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import JournalShell from "@/components/journal/JournalShell";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { journalEntryHref } from "@/lib/journal/entryNavigation";
import { entryDisplayTitle } from "@/lib/journal/entryDisplay";

interface Row {
  id: string;
  entry_at: string;
  title: string | null;
  body: string;
  mood: number | null;
  entry_kind: string | null;
}

export default function JournalCalendarPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { journalId: paramJournalId } = useParams<{ journalId?: string }>();
  const journalId = paramJournalId ?? null;
  const [rows, setRows] = useState<Row[]>([]);
  const [pickerDay, setPickerDay] = useState<{ key: string; entries: Row[] } | null>(null);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    if (!user) return;
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).toISOString().slice(0, 10);
    let query = supabase
      .from("journal_entries")
      .select("id,entry_at,title,body,mood,entry_kind")
      .or("entry_kind.is.null,entry_kind.neq.vent")
      .gte("entry_at", start)
      .lte("entry_at", end)
      .order("entry_at_ts");
    if (journalId) query = query.eq("journal_id", journalId);
    void (async () => {
      const { data } = await query;
      setRows((data as Row[]) ?? []);
    })();
  }, [user, cursor, journalId]);

  const byDay = useMemo(() => {
    const m = new Map<string, Row[]>();
    rows.forEach((r) => {
      if (!m.has(r.entry_at)) m.set(r.entry_at, []);
      m.get(r.entry_at)!.push(r);
    });
    return m;
  }, [rows]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const firstWeekday = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));

  const todayStr = new Date().toISOString().slice(0, 10);

  const openDay = (dayRows: Row[]) => {
    if (dayRows.length === 1) {
      navigate(journalEntryHref(dayRows[0].id, dayRows[0].entry_kind));
      return;
    }
    setPickerDay({ key: dayRows[0].entry_at, entries: dayRows });
  };

  return (
    <JournalShell journalId={journalId} activeTab="calendar" totalCount={rows.length} backTo="/journal">
      <div className="px-5 pt-3">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="font-display text-lg">{monthLabel}</h2>
          <button
            type="button"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 pb-4">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const key = d.toISOString().slice(0, 10);
            const dayRows = byDay.get(key) ?? [];
            const isToday = key === todayStr;
            if (dayRows.length === 0) {
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-lg border ${
                    isToday ? "border-foreground/40 bg-muted/40" : "border-border/40"
                  } p-1 text-xs text-muted-foreground`}
                >
                  {d.getDate()}
                </div>
              );
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => openDay(dayRows)}
                className={`aspect-square rounded-lg border bg-card p-1 text-xs hover:shadow-md transition relative text-left ${
                  isToday ? "border-foreground" : "border-border"
                }`}
              >
                <div className="font-medium">{d.getDate()}</div>
                <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5">
                  {dayRows.slice(0, 3).map((r) => (
                    <span key={r.id} className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  ))}
                  {dayRows.length > 3 && (
                    <span className="text-[9px] text-muted-foreground">+{dayRows.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Sheet open={pickerDay != null} onOpenChange={(open) => !open && setPickerDay(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70dvh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {pickerDay
                ? new Date(`${pickerDay.key}T12:00:00`).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : "Entries"}
            </SheetTitle>
          </SheetHeader>
          <ul className="mt-4 divide-y divide-border/50">
            {(pickerDay?.entries ?? []).map((r) => (
              <li key={r.id}>
                <Link
                  to={journalEntryHref(r.id, r.entry_kind)}
                  onClick={() => setPickerDay(null)}
                  className="block py-3 text-[15px] hover:text-primary"
                >
                  <span className="font-medium">{entryDisplayTitle(r)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </JournalShell>
  );
}
