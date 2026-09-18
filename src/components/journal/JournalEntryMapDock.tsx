import { forwardRef, memo } from "react";
import { MapPin } from "lucide-react";
import EntryMiniMap from "./EntryMiniMap";
import { formatTemp } from "@/lib/journal/context";

type Props = {
  lat: number | null; lng: number | null;
  journalName?: string; journalColor?: string;
  temperature: number | null; weatherIcon: string | null;
  weather: string | null; location: string | null;
};

/** No body, focus or save-state props: typing cannot rebuild or resize this dock. */
const JournalEntryMapDock = memo(forwardRef<HTMLDivElement, Props>(function JournalEntryMapDock({
  lat, lng, journalName, journalColor, temperature, weatherIcon, weather, location,
}, ref) {
  return (
    <div ref={ref} data-journal-map-dock className="shrink-0 border-t border-border/40 bg-background px-8 py-3">
      <div className="mx-auto w-full max-w-2xl">
        {lat != null && lng != null ? <EntryMiniMap lat={lat} lng={lng} height={200} /> : null}
        <footer className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
          {journalName && <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: `hsl(${journalColor})` }} />
            {journalName}
          </span>}
          {temperature != null && <span className="inline-flex items-center gap-1">
            {weatherIcon} {formatTemp(temperature)} {weather}
          </span>}
          {location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {location}</span>}
        </footer>
      </div>
    </div>
  );
}));
export default JournalEntryMapDock;
