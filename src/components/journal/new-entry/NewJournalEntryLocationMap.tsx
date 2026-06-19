import EntryMiniMap from "@/components/journal/EntryMiniMap";
import CurrentLocationMap from "@/components/journal/CurrentLocationMap";
import { cn } from "@/lib/utils";

type Props = {
  lat: number | null;
  lng: number | null;
  inMiniPhone?: boolean;
  isMobile?: boolean;
  /** Anchored above the bottom toolbar (shorter height). */
  docked?: boolean;
  className?: string;
};

function composeMapHeight(inMiniPhone: boolean, isMobile: boolean, docked: boolean): number {
  if (docked) {
    if (inMiniPhone) return 140;
    if (isMobile) return 160;
    return 168;
  }
  if (inMiniPhone) return 180;
  if (isMobile) return Math.min(320, Math.max(220, Math.round(window.innerHeight * 0.28)));
  return 240;
}

/** Location map for compose — fills space below the body until the keyboard opens. */
export function NewJournalEntryLocationMap({
  lat,
  lng,
  inMiniPhone = false,
  isMobile = false,
  docked = false,
  className,
}: Props) {
  const height = composeMapHeight(inMiniPhone, isMobile, docked);
  const hasCoords =
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  return (
    <div
      data-journal-compose-map
      className={cn(docked ? "w-full" : "mt-4 w-full min-h-[28dvh]", className)}
      aria-label="Entry location"
    >
      {hasCoords ? (
        <EntryMiniMap lat={lat!} lng={lng!} height={height} className="w-full" />
      ) : (
        <CurrentLocationMap
          height={height}
          className="w-full"
          showLocationLabel={!docked}
        />
      )}
    </div>
  );
}
