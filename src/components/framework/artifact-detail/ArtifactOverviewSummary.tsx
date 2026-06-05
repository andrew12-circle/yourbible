import { CheckCircle2, Compass, Sparkles, XCircle } from "lucide-react";
import ArtifactStudySectionHeader from "@/components/framework/artifact-detail/ArtifactStudySectionHeader";
import type { ArtifactFrameworkOverview } from "@/lib/framework/artifactOverviewSummary";
import { artifactCard, artifactScrollMt } from "@/lib/framework/artifactSurfaces";
import { cn } from "@/lib/utils";

type Props = {
  overview: ArtifactFrameworkOverview;
  className?: string;
  headerClassName?: string;
};

function AlignmentBlock({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: typeof CheckCircle2;
  tone: "align" | "conflict" | "new";
}) {
  if (items.length === 0) return null;
  const toneClass =
    tone === "align"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "conflict"
        ? "text-rose-700 dark:text-rose-300"
        : "text-amber-800 dark:text-amber-200";

  return (
    <div className="space-y-2">
      <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider", toneClass)}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {title}
      </div>
      <ul className="space-y-1.5 text-sm leading-relaxed text-foreground/90">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-40" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ArtifactOverviewSummary({ overview, className, headerClassName }: Props) {
  const { summary, key_points, framework_alignment: fa } = overview;
  const hasAlignment = fa.aligns.length > 0 || fa.conflicts.length > 0 || fa.new_ground.length > 0;

  return (
    <section id="framework-summary" className={cn(artifactScrollMt, "space-y-4 scroll-mt-28", className)}>
      <ArtifactStudySectionHeader
        title="Summary"
        description="What they're saying — and how it compares to your framework."
        className={headerClassName}
      />
      <div className={cn(artifactCard, "space-y-5 p-4 sm:p-5 md:p-6")}>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Big picture
          </div>
          <p className="text-sm leading-relaxed text-foreground md:text-[15px]">{summary}</p>
        </div>

        {key_points.length > 0 ? (
          <div className="space-y-2 border-t border-border/50 pt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key points</div>
            <ul className="space-y-2 text-sm leading-relaxed text-foreground/90">
              {key_points.map((point) => (
                <li key={point} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasAlignment ? (
          <div className="space-y-4 border-t border-border/50 pt-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Compared to your framework
            </div>
            <div className="grid gap-5 sm:grid-cols-1 lg:grid-cols-1">
              <AlignmentBlock title="Aligns" items={fa.aligns} icon={CheckCircle2} tone="align" />
              <AlignmentBlock title="Conflicts" items={fa.conflicts} icon={XCircle} tone="conflict" />
              <AlignmentBlock title="New ground" items={fa.new_ground} icon={Compass} tone="new" />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
