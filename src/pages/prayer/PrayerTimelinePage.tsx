import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PrayerShell from "@/components/prayer/PrayerShell";
import PrayerTimelineEventRow from "@/components/prayer/PrayerTimelineEventRow";
import { listAllTimelineEvents } from "@/lib/prayer/api";

export default function PrayerTimelinePage() {
  const { user, loading } = useAuth();
  const [events, setEvents] = useState<
    Awaited<ReturnType<typeof listAllTimelineEvents>>
  >([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      setFetching(true);
      const rows = await listAllTimelineEvents(user.id);
      setEvents(rows);
      setFetching(false);
    })();
  }, [user]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const ev of events) {
      const key = ev.occurred_at.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [events]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <PrayerShell title="Timeline">
      <p className="mb-5 text-sm text-muted-foreground leading-relaxed">
        See how God worked through circumstances — not just the final answer — across all your requests.
      </p>

      {fetching ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Timeline events appear when you add requests, link journal entries, or mark prayers answered.
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map(([day, dayEvents]) => (
            <section key={day}>
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
                {new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h2>
              <div>
                {dayEvents
                  .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
                  .map((event, i, arr) => (
                    <PrayerTimelineEventRow
                      key={event.id}
                      event={event}
                      requestTitle={event.request_title}
                      isLast={i === arr.length - 1}
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PrayerShell>
  );
}
