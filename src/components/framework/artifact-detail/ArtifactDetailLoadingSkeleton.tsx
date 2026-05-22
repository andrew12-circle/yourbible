import { BookOpen, FileText, Sparkles, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

const shimmer = "animate-pulse bg-muted/70";

function SkeletonLine({ className }: { className?: string }) {
  return <span className={cn("block rounded-full", shimmer, className)} aria-hidden />;
}

function SkeletonCard({ accent, number, className }: { accent: string; number: number; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[170px] min-w-[13rem] flex-1 flex-col justify-between rounded-3xl border border-white/10",
        "bg-gradient-to-br from-stone-900 via-stone-950 to-black p-5 shadow-[0_12px_48px_rgba(0,0,0,0.28)]",
        className,
      )}
    >
      <div className="space-y-4">
        <span className={cn("font-display text-4xl font-semibold leading-none", accent)}>{number}</span>
        <div className="space-y-2">
          <SkeletonLine className="h-4 w-11/12 bg-white/18" />
          <SkeletonLine className="h-4 w-4/5 bg-white/14" />
          <SkeletonLine className="h-4 w-2/3 bg-white/10" />
        </div>
      </div>
      <SkeletonLine className="h-3 w-24 bg-white/12" />
    </div>
  );
}

export default function ArtifactDetailLoadingSkeleton() {
  const tabs = [
    { label: "Study", Icon: BookOpen },
    { label: "Transcript", Icon: FileText },
    { label: "Notes", Icon: StickyNote },
  ];

  return (
    <div
      className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border/40 bg-background shadow-[0_18px_60px_-36px_rgba(15,23,42,0.45)]"
      role="status"
      aria-label="Loading artifact"
    >
      <div className="grid min-h-[70vh] bg-gradient-to-b from-background via-background to-muted/20 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0">
          <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-950 via-stone-900 to-black">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_78%_55%,rgba(59,130,246,0.18),transparent_32%)]" />
            <div className="absolute left-4 top-4 flex items-center gap-2 text-white/90">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div className="space-y-1.5">
                <SkeletonLine className="h-3 w-40 bg-white/25" />
                <SkeletonLine className="h-2.5 w-24 bg-white/15" />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-3xl bg-white/15 px-5 py-4 text-center shadow-2xl ring-1 ring-white/20 backdrop-blur">
                <div className="font-display text-sm font-semibold tracking-wide text-white">Framework</div>
                <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden>
                  <span className="h-1.5 w-6 animate-pulse rounded-full bg-white/80" />
                  <span className="h-1.5 w-3 animate-pulse rounded-full bg-red-300/80 [animation-delay:120ms]" />
                  <span className="h-1.5 w-3 animate-pulse rounded-full bg-sky-300/80 [animation-delay:240ms]" />
                  <span className="h-1.5 w-3 animate-pulse rounded-full bg-emerald-300/80 [animation-delay:360ms]" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="space-y-3">
              <SkeletonLine className="h-5 w-11/12 max-w-xl" />
              <div className="flex items-center gap-3">
                <span className={cn("h-9 w-9 rounded-full", shimmer)} aria-hidden />
                <SkeletonLine className="h-4 w-44" />
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-muted/30 p-1.5">
              {tabs.map(({ label, Icon }, index) => (
                <div
                  key={label}
                  className={cn(
                    "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-medium",
                    index === 0 ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-border/40 bg-card/70 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
              <div className="mb-4 flex items-center justify-between">
                <SkeletonLine className="h-5 w-40" />
                <SkeletonLine className="h-3 w-16" />
              </div>
              <div className="flex gap-3 overflow-hidden">
                <SkeletonCard accent="text-white" number={1} />
                <SkeletonCard accent="text-red-400" number={2} className="hidden sm:flex" />
                <SkeletonCard accent="text-sky-400" number={3} className="hidden md:flex" />
              </div>
            </div>
          </div>
        </section>

        <aside className="hidden border-l border-border/50 bg-card/40 p-5 lg:block">
          <div className="mb-5 space-y-2">
            <SkeletonLine className="h-4 w-36" />
            <SkeletonLine className="h-3 w-52" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <SkeletonLine className="mt-1 h-5 w-12 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="h-3.5 w-full" />
                  <SkeletonLine className="h-3.5 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <span className="sr-only">Preparing your artifact study workspace…</span>
    </div>
  );
}
