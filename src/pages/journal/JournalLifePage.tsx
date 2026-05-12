import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { BookOpenCheck, ChevronRight, CloudMoon, PartyPopper } from "lucide-react";
import JournalShell from "@/components/journal/JournalShell";
import JournalLayout from "./JournalLayout";
import EntryListItem, { type EntryListData } from "@/components/journal/EntryListItem";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getSignedPhotoUrls } from "@/lib/journal/photos";
import {
  ENTRY_KIND_META,
  FAITH_JOURNAL_LIST_TITLES,
  lifeSegmentToKind,
  type JournalEntryKind,
} from "@/lib/journal/entryKinds";

type EntryRow = EntryListData & { journal_id?: string | null };

export default function JournalLifePage() {
  const { user, loading } = useAuth();
  const { kind: kindParam } = useParams<{ kind?: string }>();
  const kind = kindParam ? lifeSegmentToKind(kindParam) : null;

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  if (kindParam && !kind) {
    return <Navigate to="/journal/life" replace />;
  }

  if (!kindParam) {
    return <Hub />;
  }

  return <KindList kind={kind} />;
}

function Hub() {
  return (
    <JournalLayout title="Faith journal" back="/journal" largeTitle>
      <p className="text-muted-foreground text-[15px] leading-relaxed mb-6">
        Dreams, praise reports, and testimonies live here as journal entries. Mark the type when you write (or pick
        it on the full composer). Your testimony naturally changes over time—each entry is a snapshot you can revisit.
      </p>
      <div className="space-y-3">
        <LifeHubCard
          to="/journal/life/dream"
          icon={<CloudMoon className="h-6 w-6" aria-hidden />}
          title="Dream journal"
          description={ENTRY_KIND_META.dream.shortHint}
          gradient="from-indigo-950/92 via-indigo-800/85 to-indigo-600/75"
        />
        <LifeHubCard
          to="/journal/life/praise"
          icon={<PartyPopper className="h-6 w-6" aria-hidden />}
          title="Praise reports"
          description={ENTRY_KIND_META.praise_report.shortHint}
          gradient="from-amber-950/90 via-amber-800/82 to-amber-600/72"
        />
        <LifeHubCard
          to="/journal/life/testimony"
          icon={<BookOpenCheck className="h-6 w-6" aria-hidden />}
          title="Testimonies"
          description={ENTRY_KIND_META.testimony.shortHint}
          gradient="from-emerald-950/90 via-emerald-800/84 to-emerald-600/74"
        />
      </div>
    </JournalLayout>
  );
}

function LifeHubCard({
  to,
  icon,
  title,
  description,
  gradient,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <Link
      to={to}
      className={
        "flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br p-4 text-white shadow-md " +
        "transition active:scale-[0.99] hover:opacity-95 " +
        gradient
      }
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">{icon}</div>
      <div className="min-w-0 flex-1">
        <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-[13px] leading-snug text-white/85">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-white/70" aria-hidden />
    </Link>
  );
}

function KindList({ kind }: { kind: JournalEntryKind }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("journal_entries")
        .select(
          "id,title,body,entry_at_ts,mood,location_name,weather,weather_temp_c,weather_icon,pinned,analyze_for_mirror,entry_kind",
        )
        .eq("user_id", user.id)
        .eq("entry_kind", kind)
        .order("pinned", { ascending: false })
        .order("entry_at_ts", { ascending: false })
        .limit(200);
      const list = (data as EntryRow[]) ?? [];
      setEntries(list);

      const ids = list.map((e) => e.id);
      if (ids.length) {
        const { data: photos } = await supabase
          .from("journal_photos")
          .select("entry_id,storage_path,created_at")
          .in("entry_id", ids)
          .order("created_at");
        const firstByEntry: Record<string, string> = {};
        (photos ?? []).forEach((p: { entry_id: string; storage_path: string }) => {
          if (!firstByEntry[p.entry_id]) firstByEntry[p.entry_id] = p.storage_path;
        });
        const urls = await getSignedPhotoUrls(Object.values(firstByEntry));
        const byEntry: Record<string, string> = {};
        for (const [eid, p] of Object.entries(firstByEntry)) {
          if (urls[p]) byEntry[eid] = urls[p];
        }
        setPhotoUrls(byEntry);
      } else {
        setPhotoUrls({});
      }
    })();
  }, [user, kind]);

  const composeQs = kind === "praise_report" ? "kind=praise" : `kind=${kind}`;

  const pinned = useMemo(() => entries.filter((e) => e.pinned), [entries]);
  const rest = useMemo(() => entries.filter((e) => !e.pinned), [entries]);

  const grouped = useMemo(() => {
    const map = new Map<string, EntryRow[]>();
    for (const e of rest) {
      const key = e.entry_at_ts.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return [...map.entries()];
  }, [rest]);

  return (
    <JournalShell
      journalId={null}
      activeTab="list"
      coverTitle={FAITH_JOURNAL_LIST_TITLES[kind]}
      subtitle={`${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
      backTo="/journal/life"
      composeHref={`/journal/new?${composeQs}`}
    >
      {entries.length === 0 && (
        <div className="px-5 pt-6 text-center">
          <p className="text-lg font-semibold tracking-tight">Nothing here yet</p>
          <p className="mt-1 text-[15px] text-muted-foreground">
            Tap the compose button to add your first {ENTRY_KIND_META[kind].label.toLowerCase()} entry.
          </p>
        </div>
      )}

      {pinned.length > 0 && (
        <section className="mb-1">
          <h2 className="sticky top-0 z-10 border-b border-border/40 bg-background/85 px-5 py-1.5 text-[13px] font-semibold tracking-tight text-foreground/90 backdrop-blur-xl">
            Pinned
          </h2>
          <div className="divide-y divide-border/40">
            {pinned.map((e) => (
              <EntryListItem key={e.id} entry={{ ...e, photo_url: photoUrls[e.id] }} />
            ))}
          </div>
        </section>
      )}

      {grouped.map(([month, list]) => (
        <section key={month}>
          <h2 className="sticky top-0 z-10 border-b border-border/40 bg-background/85 px-5 py-1.5 text-[13px] font-semibold tracking-tight text-foreground/90 backdrop-blur-xl">
            {formatMonth(month)}
          </h2>
          <div className="divide-y divide-border/40">
            {list.map((e) => (
              <EntryListItem key={e.id} entry={{ ...e, photo_url: photoUrls[e.id] }} />
            ))}
          </div>
        </section>
      ))}
    </JournalShell>
  );
}

function formatMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
