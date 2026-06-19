import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import EntryMiniMap from "@/components/journal/EntryMiniMap";
import { getCurrentContext, type EntryContext } from "@/lib/journal/context";
import { cn } from "@/lib/utils";

const MAP_HEIGHT = 320;

interface Props {
  className?: string;
  /** Map height in px (default 320). */
  height?: number;
  /** Show city name above the map (default true). */
  showLocationLabel?: boolean;
}

function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

class MapErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CurrentLocationMap]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-[320px] items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          <span>Map could not be loaded</span>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CurrentLocationMap({
  className,
  height = MAP_HEIGHT,
  showLocationLabel = true,
}: Props) {
  const [ctx, setCtx] = useState<EntryContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentContext()
      .then((c) => {
        if (!cancelled) setCtx(c);
      })
      .catch(() => {
        if (!cancelled) setCtx({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-2xl border border-border bg-muted/30 text-muted-foreground",
          className,
        )}
        style={{ height }}
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="text-sm">Finding your location…</span>
      </div>
    );
  }

  if (!isValidLatLng(ctx?.lat, ctx?.lng)) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground",
          className,
        )}
        style={{ height }}
      >
        <MapPin className="h-4 w-4 shrink-0" aria-hidden />
        <span>Enable location access to see where you are</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {showLocationLabel && ctx.location_name ? (
        <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {ctx.location_name}
        </p>
      ) : null}
      <MapErrorBoundary>
        <EntryMiniMap lat={ctx.lat} lng={ctx.lng} height={height} />
      </MapErrorBoundary>
    </div>
  );
}
