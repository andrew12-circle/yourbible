import { useState } from "react";
import { ChevronDown, Compass, Leaf, Sparkles } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ACTION_LABELS,
  CLAIM_TYPE_LABELS,
  CONFIDENCE_LABELS,
  CONFIDENCE_METER,
  type ClaimEpistemology,
  hasEpistemologyContent,
} from "@/lib/framework/epistemology";
import { cn } from "@/lib/utils";

interface ClaimEpistemologyPanelProps {
  epistemology: ClaimEpistemology | null | undefined;
  variant?: "default" | "dark";
  className?: string;
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

  return (
    <section
      className={cn(
        "space-y-3.5 rounded-lg border p-3.5 text-xs sm:p-4",
        dark
          ? "border-white/10 bg-white/5 text-white/85"
          : "border-indigo-200/70 bg-indigo-50/50 backdrop-blur-[2px] dark:border-indigo-800/45 dark:bg-indigo-950/25",
        className,
      )}
      aria-label="Epistemology"
    >
      <div
        className={cn(
          "flex items-center gap-2 uppercase tracking-wider",
          dark ? "text-white/55" : "text-indigo-900/80 dark:text-indigo-200/90",
        )}
      >
        <Compass className="h-3 w-3 shrink-0" />
        How to read this claim
      </div>

      {(ep.claim_types?.length || ep.confidence_level) ? (
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

          {ep.confidence_level && meter != null ? (
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
          <CollapsibleContent
            className={cn(
              "mt-2 space-y-2.5 rounded border p-2.5 font-sans text-sm leading-relaxed",
              dark
                ? "border-white/10 bg-white/5 text-white/80"
                : "border-border/40 bg-background/40 text-foreground/95",
            )}
          >
            {ep.hermeneutics.reasoning_bridge ? (
              <p>{ep.hermeneutics.reasoning_bridge}</p>
            ) : null}
            {ep.hermeneutics.assumptions?.length ? (
              <div>
                <p
                  className={cn(
                    "mb-1 text-[10px] uppercase tracking-wider",
                    dark ? "text-white/50" : "text-muted-foreground",
                  )}
                >
                  Assumptions
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-xs">
                  {ep.hermeneutics.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {ep.hermeneutics.potential_weaknesses?.length ? (
              <div>
                <p
                  className={cn(
                    "mb-1 text-[10px] uppercase tracking-wider",
                    dark ? "text-white/50" : "text-muted-foreground",
                  )}
                >
                  Potential weaknesses
                </p>
                <ul
                  className={cn(
                    "list-inside list-disc space-y-0.5 text-xs",
                    dark ? "text-white/60" : "text-muted-foreground",
                  )}
                >
                  {ep.hermeneutics.potential_weaknesses.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {ep.fruits?.length ? (
        <div>
          <div
            className={cn(
              "mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider",
              dark ? "text-white/50" : "text-muted-foreground",
            )}
          >
            <Leaf className="h-3 w-3" />
            What this belief tends to produce
          </div>
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

      {ep.suggested_actions?.length ? (
        <div>
          <div
            className={cn(
              "mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider",
              dark ? "text-white/50" : "text-muted-foreground",
            )}
          >
            <Sparkles className="h-3 w-3" />
            Ways to engage
          </div>
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
