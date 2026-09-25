import { cn } from "@/lib/utils";

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60 bg-[length:200%_100%] motion-reduce:animate-none",
        className,
      )}
    />
  );
}

export function ArtifactLibrarySkeleton({ count = 12 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading artifacts" aria-busy="true">
      <div aria-hidden="true">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <ShimmerBlock className="h-10 w-full max-w-md" />
            <ShimmerBlock className="hidden h-10 w-72 md:block" />
          </div>
          <div className="hidden gap-2 md:flex">
            {Array.from({ length: 6 }).map((_, i) => (
              <ShimmerBlock key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </div>
        <ShimmerBlock className="mt-6 h-12 w-full rounded-xl" />
        <ShimmerBlock className="mb-4 mt-8 h-6 w-36" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="min-w-0 space-y-2">
              <ShimmerBlock className="aspect-video w-full shadow-sm" />
              <ShimmerBlock className="h-3 w-[85%]" />
              <ShimmerBlock className="h-3 w-[65%]" />
              <ShimmerBlock className="h-2.5 w-[50%]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
