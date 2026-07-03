import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { timelineEventIcon, timelineEventLabel } from "@/components/prayer/prayerTimelineIcons";
import type { PrayerTimelineEventRow } from "@/lib/prayer/types";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function linkForEvent(event: PrayerTimelineEventRow): string | null {
  if (event.link_ref.entry_id) return `/journal/${event.link_ref.entry_id}`;
  if (event.link_ref.artifact_id) return `/framework/artifacts/${event.link_ref.artifact_id}`;
  if (event.link_ref.verse_ref) {
    const parts = event.link_ref.verse_ref.split(/\s+/);
    const ref = parts[parts.length - 1] ?? event.link_ref.verse_ref;
    const book = parts.slice(0, -1).join(" ") || ref;
    return `/read/${encodeURIComponent(book.replace(/\s+/g, ""))}/1`;
  }
  return null;
}

export default function PrayerTimelineEventRow({
  event,
  requestTitle,
  showConnector = true,
  isLast = false,
}: {
  event: PrayerTimelineEventRow;
  requestTitle?: string;
  showConnector?: boolean;
  isLast?: boolean;
}) {
  const Icon = timelineEventIcon(event.event_kind);
  const href = linkForEvent(event);

  const inner = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{formatWhen(event.occurred_at)}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{event.title}</p>
      {requestTitle ? <p className="text-xs text-muted-foreground">{requestTitle}</p> : null}
      {event.body ? (
        <p className="mt-1 text-sm text-muted-foreground leading-snug whitespace-pre-wrap">{event.body}</p>
      ) : null}
      <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground/80">
        {timelineEventLabel(event.event_kind)}
      </p>
    </>
  );

  return (
    <div className="relative flex gap-3">
      {showConnector && !isLast ? (
        <span className="absolute left-[11px] top-6 bottom-0 w-px bg-border" aria-hidden />
      ) : null}
      <div
        className={cn(
          "relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-background",
          event.event_kind === "answered" || event.event_kind === "praise"
            ? "border-emerald-500/50 text-emerald-600"
            : "text-muted-foreground",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      {href ? (
        <Link to={href} className="min-w-0 flex-1 pb-6 hover:opacity-90">
          {inner}
        </Link>
      ) : (
        <div className="min-w-0 flex-1 pb-6">{inner}</div>
      )}
    </div>
  );
}
