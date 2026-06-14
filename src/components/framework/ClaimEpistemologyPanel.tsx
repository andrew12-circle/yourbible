import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  Compass,
  GitBranch,
  HelpCircle,
  Leaf,
  Scale,
  Sparkles,
  Split,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ACTION_LABELS,
  ALTERNATIVE_STANCE_LABELS,
  CLAIM_TYPE_LABELS,
  CONFIDENCE_AXIS_LABELS,
  CONFIDENCE_LABELS,
  CONFIDENCE_METER,
  EVIDENCE_KIND_LABELS,
  EVIDENCE_STRENGTH_LABELS,
  RELATIONSHIP_LINK_KIND_LABELS,
  SCHOLARLY_CONSENSUS_LABELS,
  SPECULATION_LEVEL_LABELS,
  type ClaimEpistemology,
  hasEpistemologyContent,
} from "@/lib/framework/epistemology";
import { cn } from "@/lib/utils";

interface ClaimEpistemologyPanelProps {
  epistemology: ClaimEpistemology | null | undefined;
  variant?: "default" | "dark";
  className?: string;
}

function SectionHeading({
  dark,
  icon: Icon,
  children,
}: {
  dark: boolean;
  icon: typeof Compass;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider",
        dark ? "text-white/50" : "text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {children}
    </div>
  );
}

function SubList({
  dark,
  title,
  items,
}: {
  dark: boolean;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <p
        className={cn(
          "mb-1 text-[10px] uppercase tracking-wider",
          dark ? "text-white/50" : "text-muted-foreground",
        )}
      >
        {title}
      </p>
      <ul className="list-inside list-disc space-y-0.5 text-xs leading-relaxed">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PanelBlock({
  dark,
  className,
  children,
}: {
  dark: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-2.5",
        dark
          ? "border-white/10 bg-white/5 text-white/80"
          : "border-border/50 bg-background/50 text-foreground/95",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function ClaimEpistemologyPanel({
  epistemology,
  variant = "default",
  className,
}: ClaimEpistemologyPanelProps) {
  const dark = variant === "dark";
  const [hermOpen, setHermOpen] = useState(false);

  if (!hasEpistemologyContent(epistemology)) return null;

  const ep = epistemology!;
  const meter = ep.confidence_level ? CONFIDENCE_METER[ep.confidence_level] : null;
  const hasConfidenceAxes = Boolean(ep.confidence_axes && Object.keys(ep.confidence_axes).length);

  return (
    <section
      className={cn(
        "space-y-3.5 rounded-lg border p-3.5 text-xs sm:p-4",
        dark
          ? "border-white/10 bg-white/5 text-white/85"
          : "border-indigo-200/70 bg-indigo-50/50 backdrop-blur-[2px] dark:border-indigo-800/45 dark:bg-indigo-950/25",
        className,
      )}
      aria-label="Belief mapping"
    >
      <div
        className={cn(
          "flex items-center gap-2 uppercase tracking-wider",
          dark ? "text-white/55" : "text-indigo-900/80 dark:text-indigo-200/90",
        )}
      >
        <Compass className="h-3 w-3 shrink-0" />
        Belief mapping
      </div>

      {ep.claim_breakdown?.core ? (
        <div>
          <SectionHeading dark={dark} icon={Split}>
            Claim breakdown
          </SectionHeading>
          <PanelBlock dark={dark} className="space-y-2.5">
            <div>
              <p
                className={cn(
                  "mb-1 text-[10px] uppercase tracking-wider",
                  dark ? "text-white/50" : "text-muted-foreground",
                )}
              >
                Core claim
              </p>
              <p className="text-sm leading-relaxed">{ep.claim_breakdown.core}</p>
            </div>
            {ep.claim_breakdown.supporting?.length ? (
              <SubList dark={dark} title="Supporting claims" items={ep.claim_breakdown.supporting} />
            ) : null}
            {ep.claim_breakdown.implied?.length ? (
              <SubList dark={dark} title="Implied claims" items={ep.claim_breakdown.implied} />
            ) : null}
            {ep.claim_breakdown.speculative?.length ? (
              <SubList dark={dark} title="Speculative extensions" items={ep.claim_breakdown.speculative} />
            ) : null}
          </PanelBlock>
        </div>
      ) : null}

      {ep.evidence?.items.length ? (
        <div>
          <SectionHeading dark={dark} icon={Scale}>
            Evidence cited
          </SectionHeading>
          <ul className="space-y-2">
            {ep.evidence.items.map((item) => (
              <li
                key={`${item.label}-${item.kind}-${item.strength}`}
                className={cn(
                  "rounded-md border px-2.5 py-2",
                  dark ? "border-white/10 bg-white/5" : "border-border/50 bg-background/55",
                )}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-sm">{item.label}</span>
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wide",
                      dark ? "border-white/15 text-white/65" : "border-border/70 text-muted-foreground",
                    )}
                  >
                    {EVIDENCE_KIND_LABELS[item.kind]}
                  </span>
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wide",
                      item.strength === "direct"
                        ? dark
                          ? "border-emerald-400/40 text-emerald-200"
                          : "border-emerald-300/60 text-emerald-800 dark:text-emerald-200"
                        : item.strength === "speculative"
                          ? dark
                            ? "border-amber-400/40 text-amber-200"
                            : "border-amber-300/60 text-amber-900 dark:text-amber-200"
                          : dark
                            ? "border-white/15 text-white/65"
                            : "border-border/70 text-muted-foreground",
                    )}
                  >
                    {EVIDENCE_STRENGTH_LABELS[item.strength]}
                  </span>
                </div>
                {item.note ? (
                  <p className={cn("mt-1 text-xs leading-relaxed", dark ? "text-white/60" : "text-muted-foreground")}>
                    {item.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ep.alternative_views?.length ? (
        <div>
          <SectionHeading dark={dark} icon={GitBranch}>
            Alternative interpretations
          </SectionHeading>
          <ul className="space-y-2">
            {ep.alternative_views.map((view) => (
              <li
                key={view.name}
                className={cn(
                  "rounded-md border px-2.5 py-2",
                  dark ? "border-white/10 bg-white/5" : "border-border/50 bg-background/55",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{view.name}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide",
                      view.stance === "supports"
                        ? dark
                          ? "bg-emerald-400/15 text-emerald-200"
                          : "bg-emerald-50 text-emerald-800"
                        : view.stance === "opposes"
                          ? dark
                            ? "bg-rose-400/15 text-rose-200"
                            : "bg-rose-50 text-rose-800"
                          : dark
                            ? "bg-white/10 text-white/70"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    {ALTERNATIVE_STANCE_LABELS[view.stance]}
                  </span>
                </div>
                <p className={cn("mt-1 text-xs leading-relaxed", dark ? "text-white/70" : "text-muted-foreground")}>
                  {view.summary}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ep.framework_impact?.if_accepted?.length || ep.framework_impact?.if_rejected?.length ? (
        <div>
          <SectionHeading dark={dark} icon={Split}>
            Framework impact
          </SectionHeading>
          <div className="grid gap-2 sm:grid-cols-2">
            {ep.framework_impact.if_accepted?.length ? (
              <PanelBlock dark={dark}>
                <p
                  className={cn(
                    "mb-1.5 text-[10px] font-medium uppercase tracking-wider",
                    dark ? "text-emerald-300/80" : "text-emerald-700 dark:text-emerald-300",
                  )}
                >
                  If accepted
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-xs leading-relaxed">
                  {ep.framework_impact.if_accepted.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </PanelBlock>
            ) : null}
            {ep.framework_impact.if_rejected?.length ? (
              <PanelBlock dark={dark}>
                <p
                  className={cn(
                    "mb-1.5 text-[10px] font-medium uppercase tracking-wider",
                    dark ? "text-sky-300/80" : "text-sky-800 dark:text-sky-300",
                  )}
                >
                  If rejected
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-xs leading-relaxed">
                  {ep.framework_impact.if_rejected.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </PanelBlock>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasConfidenceAxes ? (
        <div>
          <SectionHeading dark={dark} icon={Scale}>
            Confidence
          </SectionHeading>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {ep.confidence_axes?.scriptural ? (
              <div className={cn("flex justify-between gap-2 rounded border px-2 py-1.5", dark ? "border-white/10" : "border-border/50")}>
                <span className={dark ? "text-white/55" : "text-muted-foreground"}>Scriptural</span>
                <span className="font-medium">{CONFIDENCE_AXIS_LABELS[ep.confidence_axes.scriptural]}</span>
              </div>
            ) : null}
            {ep.confidence_axes?.historical ? (
              <div className={cn("flex justify-between gap-2 rounded border px-2 py-1.5", dark ? "border-white/10" : "border-border/50")}>
                <span className={dark ? "text-white/55" : "text-muted-foreground"}>Historical</span>
                <span className="font-medium">{CONFIDENCE_AXIS_LABELS[ep.confidence_axes.historical]}</span>
              </div>
            ) : null}
            {ep.confidence_axes?.scholarly_consensus ? (
              <div className={cn("flex justify-between gap-2 rounded border px-2 py-1.5", dark ? "border-white/10" : "border-border/50")}>
                <span className={dark ? "text-white/55" : "text-muted-foreground"}>Scholarly consensus</span>
                <span className="font-medium">
                  {SCHOLARLY_CONSENSUS_LABELS[ep.confidence_axes.scholarly_consensus]}
                </span>
              </div>
            ) : null}
            {ep.confidence_axes?.speculation ? (
              <div className={cn("flex justify-between gap-2 rounded border px-2 py-1.5", dark ? "border-white/10" : "border-border/50")}>
                <span className={dark ? "text-white/55" : "text-muted-foreground"}>Speculation</span>
                <span className="font-medium">{SPECULATION_LEVEL_LABELS[ep.confidence_axes.speculation]}</span>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {(ep.claim_types?.length || (ep.confidence_level && !hasConfidenceAxes)) ? (
        <div className="space-y-2">
          {ep.claim_types?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {ep.claim_types.map((t) => (
                <span
                  key={t}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    dark
                      ? "border-white/15 bg-white/10 text-white/80"
                      : "border-indigo-300/60 bg-background/80 text-indigo-950 dark:border-indigo-700/50 dark:text-indigo-100",
                  )}
                >
                  {CLAIM_TYPE_LABELS[t]}
                </span>
              ))}
            </div>
          ) : null}

          {ep.confidence_level && meter != null && !hasConfidenceAxes ? (
            <div className="space-y-1">
              <div
                className={cn(
                  "flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider",
                  dark ? "text-white/50" : "text-muted-foreground",
                )}
              >
                <span>Scriptural / scholarly support</span>
                <span className={cn("font-medium normal-case", dark ? "text-white/80" : "text-foreground/90")}>
                  {CONFIDENCE_LABELS[ep.confidence_level]}
                </span>
              </div>
              <div
                className={cn(
                  "flex h-1.5 gap-0.5 overflow-hidden rounded-full",
                  dark ? "bg-white/10" : "bg-background/60",
                )}
                role="meter"
                aria-valuenow={meter}
                aria-valuemin={0}
                aria-valuemax={5}
                aria-label={CONFIDENCE_LABELS[ep.confidence_level]}
              >
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 rounded-sm transition-colors",
                      i <= meter
                        ? dark
                          ? "bg-primary/80"
                          : "bg-indigo-500/85 dark:bg-indigo-400/80"
                        : dark
                          ? "bg-white/15"
                          : "bg-muted/80",
                    )}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {ep.hermeneutics &&
      (ep.hermeneutics.reasoning_bridge ||
        ep.hermeneutics.assumptions?.length ||
        ep.hermeneutics.potential_weaknesses?.length) ? (
        <Collapsible open={hermOpen} onOpenChange={setHermOpen}>
          <CollapsibleTrigger
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded border px-2.5 py-2 text-left text-[11px] font-medium uppercase tracking-wider",
              dark
                ? "border-white/12 bg-white/5 text-white/75 hover:bg-white/10"
                : "border-border/50 bg-background/50 text-foreground/90 hover:bg-background/80",
            )}
          >
            How they got here
            <ChevronDown
              className={cn("h-3.5 w-3.5 shrink-0 transition-transform", hermOpen && "rotate-180")}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <PanelBlock dark={dark} className="space-y-2.5 font-sans text-sm leading-relaxed">
              {ep.hermeneutics.reasoning_bridge ? <p>{ep.hermeneutics.reasoning_bridge}</p> : null}
              {ep.hermeneutics.assumptions?.length ? (
                <SubList dark={dark} title="Assumptions" items={ep.hermeneutics.assumptions} />
              ) : null}
              {ep.hermeneutics.potential_weaknesses?.length ? (
                <SubList dark={dark} title="Potential weaknesses" items={ep.hermeneutics.potential_weaknesses} />
              ) : null}
            </PanelBlock>
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {ep.fruits?.length ? (
        <div>
          <SectionHeading dark={dark} icon={Leaf}>
            What this belief tends to produce
          </SectionHeading>
          <div className="flex flex-wrap gap-1.5">
            {ep.fruits.map((f) => (
              <span
                key={f}
                className={cn(
                  "rounded border px-2 py-0.5 text-[10px] capitalize",
                  dark
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border-emerald-300/50 bg-emerald-50/90 text-emerald-950 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-100",
                )}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {ep.questions_raised?.length ? (
        <div>
          <SectionHeading dark={dark} icon={HelpCircle}>
            Questions this raises
          </SectionHeading>
          <ul className="list-inside list-disc space-y-1 text-xs leading-relaxed">
            {ep.questions_raised.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {ep.relationship_links?.length ? (
        <div>
          <SectionHeading dark={dark} icon={GitBranch}>
            Relationship map
          </SectionHeading>
          <ul className="space-y-1">
            {ep.relationship_links.map((link) => (
              <li
                key={`${link.kind}-${link.label}`}
                className={cn(
                  "flex items-start gap-2 rounded border px-2 py-1.5 text-xs",
                  dark ? "border-white/10 bg-white/5" : "border-border/50 bg-background/40",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded px-1 py-0.5 text-[9px] uppercase tracking-wide",
                    dark ? "bg-white/10 text-white/60" : "bg-muted text-muted-foreground",
                  )}
                >
                  {RELATIONSHIP_LINK_KIND_LABELS[link.kind]}
                </span>
                <span className="leading-relaxed">{link.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ep.suggested_actions?.length ? (
        <div>
          <SectionHeading dark={dark} icon={Sparkles}>
            Ways to engage
          </SectionHeading>
          <div className="flex flex-wrap gap-1.5">
            {ep.suggested_actions.map((a) => (
              <span
                key={a}
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px] font-medium",
                  dark
                    ? "border-white/12 bg-white/5 text-white/80"
                    : "border-border/70 bg-background/70 text-foreground/90",
                )}
                title="Suggested next step — does not change your verdict"
              >
                {ACTION_LABELS[a]}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
