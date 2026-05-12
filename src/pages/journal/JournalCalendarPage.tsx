import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import JournalLayout from "./JournalLayout";

interface Row {
  id: string;
  entry_at: string;
  title: string | null;
  mood: number | null;
}

export default function JournalCalendarPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    if (!user) return;
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1).toISOString().slice(0, 10);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).toISOString().slice(0, 10);
    supabase
      .from("journal_entries")
      .select("id,entry_at,title,mood")
      .or("entry_kind.is.null,entry_kind.neq.vent")
      .gte("entry_at", start)
      .lte("entry_at", end)
      .order("entry_at_ts")
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, [user, cursor]);

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

  return (
    <JournalLayout title="Calendar" back="/journal">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="font-display text-lg">{monthLabel}</h2>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
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
            <Link
              key={i}
              to={`/journal/${dayRows[0].id}`}
              className={`aspect-square rounded-lg border bg-card p-1 text-xs hover:shadow-md transition relative ${
                isToday ? "border-foreground" : "border-border"
              }`}
            >
              <div className="font-medium">{d.getDate()}</div>
              <div className="absolute bottom-1 left-1 right-1 flex flex-wrap gap-0.5">
                {dayRows.slice(0, 3).map((r) => (
                  <span key={r.id} className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                ))}
                {dayRows.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayRows.length - 3}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </JournalLayout>
  );
}