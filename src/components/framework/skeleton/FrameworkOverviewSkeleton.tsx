import { FrameworkShimmerBlock } from "./FrameworkShimmerBlock";

export function RecentlyAddedShelfSkeleton() {
  return (
    <section className="mb-8 rounded-2xl border border-border/50 bg-card/40 p-5 shadow-sm ring-1 ring-border/30 sm:mb-10 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4 sm:mb-5">
        <div className="min-w-0 space-y-2">
          <FrameworkShimmerBlock className="h-3 w-16" />
          <FrameworkShimmerBlock className="h-6 w-40 sm:h-7 sm:w-48" />
        </div>
        <FrameworkShimmerBlock className="h-4 w-14 shrink-0" />
      </div>
      <div className="flex gap-3 overflow-hidden pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-[min(34vw,158px)] shrink-0 space-y-2 sm:w-[168px]">
            <FrameworkShimmerBlock className="aspect-[2/3] w-full shadow-sm" />
            <FrameworkShimmerBlock className="h-3 w-[85%]" />
            <FrameworkShimmerBlock className="h-2.5 w-[60%]" />
          </div>
        ))}
      </div>
    </section>
  );
}

function HeroSkeleton() {
  return (
    <section className="overflow-hidden rounded-3xl border border-border/60 bg-background shadow-sm">
      <div className="grid gap-6 p-5 sm:grid-cols-[1.2fr,0.8fr] sm:items-center sm:gap-8 sm:p-7 lg:p-8">
        <div className="min-w-0 space-y-3">
          <FrameworkShimmerBlock className="h-3 w-28" />
          <FrameworkShimmerBlock className="h-8 w-full max-w-md sm:h-9" />
          <FrameworkShimmerBlock className="h-4 w-full max-w-xl" />
          <FrameworkShimmerBlock className="h-4 w-5/6 max-w-lg" />
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <FrameworkShimmerBlock className="h-10 w-36 rounded-xl sm:h-11 sm:w-40 sm:rounded-2xl" />
            <FrameworkShimmerBlock className="h-4 w-32" />
          </div>
        </div>
        <FrameworkShimmerBlock className="mx-auto aspect-[5/4] w-full max-w-[10.5rem] rounded-2xl" />
      </div>
    </section>
  );
}

function IdentityCardSkeleton() {
  return (
    <section className="mt-5 rounded-3xl border border-border/60 bg-card p-6 shadow-sm sm:mt-6">
      <FrameworkShimmerBlock className="mb-4 h-4 w-32" />
      <FrameworkShimmerBlock className="mb-6 h-8 w-2/3 max-w-md" />
      <FrameworkShimmerBlock className="h-24 w-full" />
    </section>
  );
}

function QuickActionsSkeleton() {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <FrameworkShimmerBlock key={i} className="h-8 w-24 rounded-full sm:w-28" />
      ))}
    </div>
  );
}

function InterviewSkeleton() {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-border/60 p-4 sm:mt-8 sm:rounded-3xl sm:p-6">
      <div className="mb-5 space-y-2 sm:mb-6">
        <FrameworkShimmerBlock className="h-3 w-44" />
        <FrameworkShimmerBlock className="h-6 w-56 sm:h-7 sm:w-64" />
        <FrameworkShimmerBlock className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <FrameworkShimmerBlock key={i} className="h-36 rounded-2xl sm:h-40" />
        ))}
      </div>
    </section>
  );
}

export function FrameworkOverviewSkeleton() {
  return (
    <>
      <RecentlyAddedShelfSkeleton />
      <HeroSkeleton />
      <IdentityCardSkeleton />
      <QuickActionsSkeleton />
      <InterviewSkeleton />
    </>
  );
}
