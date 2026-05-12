import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Lightbulb, NotebookPen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import JournalLayout from "./JournalLayout";
import EntryListItem, { EntryListData } from "@/components/journal/EntryListItem";

interface Prompt {
  id: string;
  text: string;
  category: string;
}

/** Today + On This Day strip across all years. */
export default function JournalTodayPage() {
  const { user, loading } = useAuth();
  const [today, setToday] = useState<EntryListData[]>([]);
  const [onThisDay, setOnThisDay] = useState<EntryListData[]>([]);
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    (async () => {
      const { data: t } = await supabase
        .from("journal_entries")
        .select(
          "id,title,body,entry_at_ts,mood,location_name,weather,weather_temp_c,weather_icon,pinned,analyze_for_mirror,entry_kind",
        )
        .or("entry_kind.is.null,entry_kind.neq.vent")
        .gte("entry_at_ts", startOfDay.toISOString())
        .lte("entry_at_ts", endOfDay.toISOString())
        .order("entry_at_ts", { ascending: false });
      setToday((t as EntryListData[]) ?? []);

      const { data: all } = await supabase
        .from("journal_entries")
        .select(
          "id,title,body,entry_at_ts,mood,location_name,weather,weather_temp_c,weather_icon,pinned,analyze_for_mirror,entry_kind",
        )
        .or("entry_kind.is.null,entry_kind.neq.vent")
        .lt("entry_at_ts", startOfDay.toISOString())
        .order("entry_at_ts", { ascending: false })
        .limit(500);
      const m = now.getMonth();
      const d = now.getDate();
      setOnThisDay(
        ((all as EntryListData[]) ?? []).filter((e) => {
          const dt = new Date(e.entry_at_ts);
          return dt.getMonth() === m && dt.getDate() === d;
        }),
      );

      const { data: prompts } = await supabase
        .from("journal_prompts")
        .select("id,text,category")
        .limit(500);
      const list = (prompts as Prompt[]) ?? [];
      if (list.length) {
        const seed =
          now.getFullYear() * 1000 + Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
        setPrompt(list[seed % list.length]);
      }
    })();
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <JournalLayout title="Today" back="/journal">
      <p className="text-[15px] text-muted-foreground -mt-1 mb-5">{dateLabel}</p>

      {prompt && (
        <Link
          to={`/journal/new?promptId=${prompt.id}&prompt=${encodeURIComponent(prompt.text)}`}
          className="block mb-6 p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 hover:shadow-md transition"
        >
          <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-amber-700 mb-2">
            <Lightbulb className="w-3.5 h-3.5" /> Today's prompt
          </div>
          <p className="text-[17px] font-medium text-foreground leading-snug">{prompt.text}</p>
          <p className="text-[13px] text-muted-foreground mt-2">Tap to start an entry</p>
        </Link>
      )}

      <section className="mb-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
          Today
        </h2>
        {today.length === 0 ? (
          <Link
            to="/journal/new"
            className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-border bg-card/50 hover:border-foreground/30 transition"
          >
            <NotebookPen className="w-5 h-5 text-muted-foreground" />
            <span className="text-[15px] text-muted-foreground">No entry yet — write today's first thought</span>
          </Link>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50 overflow-hidden">
            {today.map((e) => <EntryListItem key={e.id} entry={e} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
          On this day
        </h2>
        {onThisDay.length === 0 ? (
          <p className="text-[14px] text-muted-foreground px-1">Nothing from past years yet.</p>
        ) : (
          <div className="bg-card rounded-2xl border border-border/50 divide-y divide-border/50 overflow-hidden">
            {onThisDay.map((e) => <EntryListItem key={e.id} entry={e} />)}
          </div>
        )}
      </section>
    </JournalLayout>
  );
}