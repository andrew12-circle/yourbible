import { cn } from "@/lib/utils";

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60 bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

export function ArtifactLibrarySkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-10">
      <div className="space-y-3">
        <ShimmerBlock className="h-5 w-40" />
        <div className="flex gap-3 overflow-hidden pb-1">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="w-[min(34vw,158px)] shrink-0 space-y-2 sm:w-[168px]">
              <ShimmerBlock className="aspect-[2/3] w-full shadow-sm" />
              <ShimmerBlock className="h-3 w-[85%]" />
              <ShimmerBlock className="h-2.5 w-[60%]" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <ShimmerBlock className="h-5 w-32" />
        <div className="flex gap-3 overflow-hidden pb-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[min(46vw,260px)] shrink-0 space-y-2 sm:w-[272px]">
              <ShimmerBlock className="aspect-video w-full shadow-sm" />
              <ShimmerBlock className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
