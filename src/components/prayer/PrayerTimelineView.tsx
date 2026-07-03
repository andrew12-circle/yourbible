import PrayerTimelineEventRow from "@/components/prayer/PrayerTimelineEventRow";
import type { PrayerTimelineEventRow as TimelineRow } from "@/lib/prayer/types";

export default function PrayerTimelineView({
  events,
  requestTitle,
}: {
  events: TimelineRow[];
  requestTitle?: string;
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No timeline events yet. Add notes as God works through circumstances.
      </p>
    );
  }

  return (
    <div className="pt-2">
      {events.map((event, i) => (
        <PrayerTimelineEventRow
          key={event.id}
          event={event}
          requestTitle={requestTitle}
          isLast={i === events.length - 1}
        />
      ))}
    </div>
  );
}
