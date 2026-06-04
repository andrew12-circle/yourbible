import { useMemo } from "react";
import { AlertCircle, BookOpen } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  epistemicLabel,
  extraReferenceParseErrors,
  formatPassagesAsMarkdown,
  formatVoicesAsMarkdown,
  getResearchPackLensLabel,
  getResearchPackLensOrder,
  partitionScriptureEntries,
  sanitizeResearchSectionBody,
  webSearchStatusLabel,
  type IndependentVoice,
  type ResearchPackResp,
  type ResearchPackSection,
} from "@/lib/framework/claimResearchPack";
import ResearchAssistantBubble from "@/components/journal/ResearchAssistantBubble";
import { cn } from "@/lib/utils";

type Props = {
  data: ResearchPackResp;
  className?: string;
  /** Remount accordion when a new pack loads (resets open section to first). */
  instanceKey?: string;
};

const triggerClass =
  "gap-2 py-2 text-[11px] font-semibold leading-snug hover:no-underline [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground";

function EpistemicBadge({ epistemic }: { epistemic: string }) {
  return (
    <span className="inline-flex shrink-0 rounded-full bg-muted/80 px-1.5 py-0.5 text-[9px] font-medium leading-none text-muted-foreground ring-1 ring-border/50">
      {epistemicLabel(epistemic)}
    </span>
  );
}

function LensSectionBody({
  section,
  lensId,
  independentVoices,
}: {
  section: ResearchPackSection;
  lensId: string;
  independentVoices: IndependentVoice[] | null | undefined;
}) {
  const voices = section.voices ?? (lensId === "independent_voices" ? independentVoices : null);

  const bodyMd = sanitizeResearchSectionBody(section.body);
  const voiceMd = voices?.length ? formatVoicesAsMarkdown(voices) : "";

  return (
    <div className="space-y-2 pb-1">
      {bodyMd ? <ResearchAssistantBubble>{bodyMd}</ResearchAssistantBubble> : null}
      {voiceMd ? <ResearchAssistantBubble>{voiceMd}</ResearchAssistantBubble> : null}
    </div>
  );
}

export default function ResearchPackView({ data, className, instanceKey }: Props) {
  const { loaded, failed } = partitionScriptureEntries(data.scripture);
  const failedRefs = new Set(failed.map((f) => f.ref));
  const extraFailed = extraReferenceParseErrors(data.meta, failedRefs);
  const allFailed = [...failed, ...extraFailed];
  const lensOrder = getResearchPackLensOrder(data);

  const accordionItems = useMemo(() => {
    const items: { id: string; title: React.ReactNode; content: React.ReactNode }[] = [];

    if (loaded.length > 0) {
      items.push({
        id: "passages",
        title: (
          <span className="flex min-w-0 items-center gap-1.5">
            <BookOpen className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">Bible passages ({loaded.length})</span>
          </span>
        ),
        content: (
          <ResearchAssistantBubble>{formatPassagesAsMarkdown(loaded)}</ResearchAssistantBubble>
        ),
      });
    }

    if (allFailed.length > 0) {
      items.push({
        id: "passages-unavailable",
        title: (
          <span className="flex min-w-0 items-center gap-1.5 text-amber-900 dark:text-amber-100">
            <AlertCircle className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate">Passages we could not load ({allFailed.length})</span>
          </span>
        ),
        content: (
          <div className="space-y-1.5">
            <ul className="space-y-1 rounded-lg border border-amber-200/70 bg-amber-50/80 px-2.5 py-2 text-[11px] dark:border-amber-900/50 dark:bg-amber-950/30">
              {allFailed.map((row) => (
                <li key={row.ref} className="leading-snug">
                  <span className="font-medium text-foreground">{row.ref}</span>
                  <span className="text-muted-foreground"> — {row.message}</span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Analysis may still use general biblical themes when passage text was unavailable.
            </p>
          </div>
        ),
      });
    }

    for (const lensId of lensOrder) {
      const section = data.sections[lensId];
      if (!section?.body?.trim()) continue;
      const title = getResearchPackLensLabel(lensId, data);
      items.push({
        id: `lens-${lensId}`,
        title: (
          <span className="flex min-w-0 flex-1 items-center gap-1.5 pr-2">
            <span className="truncate text-left">{title}</span>
            <EpistemicBadge epistemic={section.epistemic} />
          </span>
        ),
        content: (
          <LensSectionBody
            section={section}
            lensId={lensId}
            independentVoices={data.independent_voices}
          />
        ),
      });
    }

    return items;
  }, [allFailed, data, lensOrder, loaded]);

  const defaultOpen = accordionItems[0]?.id;

  if (accordionItems.length === 0) {
    return (
      <p className={cn("py-4 text-center text-[10px] text-muted-foreground", className)}>
        No sections in this pack.
      </p>
    );
  }

  return (
    <div className={cn("pb-2 text-[11px] leading-snug", className)}>
      {data.meta ? (
        <p className="mb-2 rounded-md border border-border/40 bg-muted/25 px-2.5 py-1.5 text-[10px] leading-snug text-muted-foreground">
          {webSearchStatusLabel(data.meta)}
        </p>
      ) : null}

      <Accordion
        key={instanceKey ?? defaultOpen}
        type="single"
        collapsible
        defaultValue={defaultOpen}
        className="rounded-lg border border-border/50 bg-card/50 px-1"
      >
        {accordionItems.map((item) => (
          <AccordionItem key={item.id} value={item.id} className="border-border/40 px-1.5">
            <AccordionTrigger className={triggerClass}>
              {item.title}
            </AccordionTrigger>
            <AccordionContent className="pb-2 pt-0 text-[11px]">{item.content}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
