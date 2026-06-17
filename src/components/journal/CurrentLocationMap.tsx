import { useEffect, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import EntryMiniMap from "@/components/journal/EntryMiniMap";
import { getCurrentContext, type EntryContext } from "@/lib/journal/context";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
}

export default function CurrentLocationMap({ className }: Props) {
  const [ctx, setCtx] = useState<EntryContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCurrentContext()
      .then((c) => {
        if (!cancelled) setCtx(c);
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
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        <span className="text-sm">Finding your location…</span>
      </div>
    );
  }

  if (ctx?.lat == null || ctx?.lng == null) {
    return (
      <div
        className={cn(
          "flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground",
          className,
        )}
      >
        <MapPin className="h-4 w-4 shrink-0" aria-hidden />
        <span>Enable location access to see where you are</span>
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {ctx.location_name ? (
        <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {ctx.location_name}
        </p>
      ) : null}
      <EntryMiniMap lat={ctx.lat} lng={ctx.lng} className="h-full min-h-[240px] flex-1" />
    </div>
  );
}
