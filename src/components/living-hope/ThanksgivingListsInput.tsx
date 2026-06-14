import { Input } from "@/components/ui/input";
import {
  THANKSGIVING_ITEM_COUNT,
  THANKSGIVING_NOT_YET_PROMPTS,
  THANKSGIVING_NOW_PROMPTS,
} from "@/lib/livingHope/morningRitual";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

function PromptList({ items }: { items: readonly string[] }) {
  return (
    <ul className={cn("space-y-1 mb-3 text-[13px] list-disc pl-4", lh.muted)}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

type ListProps = {
  title: string;
  description: string;
  prompts: readonly string[];
  values: string[];
  onChange: (index: number, value: string) => void;
  placeholders: readonly string[];
};

function ThanksgivingListSection({ title, description, prompts, values, onChange, placeholders }: ListProps) {
  return (
    <section className={cn(lh.cardFlat, "p-4")}>
      <h2 className={cn(lh.heading, "text-[15px] mb-1")}>{title}</h2>
      <p className={cn(lh.bodySm, "mb-3")}>{description}</p>
      <PromptList items={prompts} />
      <ol className="space-y-2 list-none p-0 m-0">
        {Array.from({ length: THANKSGIVING_ITEM_COUNT }, (_, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className={cn(lh.faint, "w-5 shrink-0 text-right tabular-nums text-[13px]")}>{i + 1}.</span>
            <Input
              value={values[i] ?? ""}
              onChange={(e) => onChange(i, e.target.value)}
              className={cn(lh.input, "flex-1")}
              placeholder={placeholders[i] ?? `Item ${i + 1}`}
              aria-label={`${title} ${i + 1}`}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

type Props = {
  thanksgivingNow: string[];
  thanksgivingNotYet: string[];
  onThanksgivingNowChange: (index: number, value: string) => void;
  onThanksgivingNotYetChange: (index: number, value: string) => void;
};

export function ThanksgivingListsInput({
  thanksgivingNow,
  thanksgivingNotYet,
  onThanksgivingNowChange,
  onThanksgivingNotYetChange,
}: Props) {
  return (
    <div className="space-y-4">
      <ThanksgivingListSection
        title="5 things you're thankful for now"
        description="Specific mercies already in your life — break anxiety and scarcity thinking."
        prompts={THANKSGIVING_NOW_PROMPTS}
        values={thanksgivingNow}
        onChange={onThanksgivingNowChange}
        placeholders={["Salvation", "Family", "Provision", "Yesterday's lesson", "Today's peace"]}
      />
      <ThanksgivingListSection
        title="5 things you're thankful for that have not yet come"
        description="Thank Him in faith for what's ahead — vision, provision, and promises you're walking toward."
        prompts={THANKSGIVING_NOT_YET_PROMPTS}
        values={thanksgivingNotYet}
        onChange={onThanksgivingNotYetChange}
        placeholders={["Income milestone", "Family dream", "System built", "Debt freedom", "Legacy"]}
      />
    </div>
  );
}
