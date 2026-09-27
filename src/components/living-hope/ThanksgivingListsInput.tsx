import { useState } from "react";
import { Check, Heart, Sprout } from "lucide-react";
import { DictateButton } from "@/components/journal/DictateButton";
import { JournalAiPrivacy } from "@/components/journal/JournalAiPrivacy";
import { useAuth } from "@/contexts/AuthContext";
import { MorningThanksgivingVoice } from "./MorningThanksgivingVoice";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { THANKSGIVING_ITEM_COUNT, THANKSGIVING_NOT_YET_PROMPTS, THANKSGIVING_NOW_PROMPTS } from "@/lib/livingHope/morningRitual";
import { lh } from "@/lib/livingHope/themeClasses";
import { cn } from "@/lib/utils";

type Props = { thanksgivingNow: string[]; thanksgivingNotYet: string[]; onThanksgivingNowChange: (index: number, value: string) => void; onThanksgivingNotYetChange: (index: number, value: string) => void };

export function ThanksgivingListsInput({ thanksgivingNow, thanksgivingNotYet, onThanksgivingNowChange, onThanksgivingNotYetChange }: Props) {
  const { user, profile } = useAuth();
  const dictationAllowed = Boolean(user && profile && profile.user_id === user.id) && !profile?.journal_e2e_enabled;
  const [group, setGroup] = useState<"now" | "not-yet">("now");
  const count = (items: string[]) => items.filter((value) => value.trim()).length;
  return <JournalAiPrivacy.Provider value={dictationAllowed}><section className="space-y-5" aria-label="Gratitude">
    <div role="group" aria-label="Gratitude lists" className="flex gap-2 rounded-xl bg-muted/50 p-1">
      {(["now", "not-yet"] as const).map((key) => <button type="button" key={key} aria-pressed={group === key} onClick={() => setGroup(key)}
        className={cn("min-h-12 flex-1 rounded-lg px-3 py-2 text-sm transition-colors", group === key ? "bg-background font-semibold text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
        {key === "now" ? "Thankful today" : "Thankful for what's ahead"}<span className="ml-2 whitespace-nowrap text-xs font-normal">{count(key === "now" ? thanksgivingNow : thanksgivingNotYet)}/{THANKSGIVING_ITEM_COUNT}</span>
      </button>)}
    </div>
    <div className="morning-gratitude-grid">{(["now", "not-yet"] as const).map((key) => {
      const now = key === "now";
      const values = now ? thanksgivingNow : thanksgivingNotYet;
      const onChange = now ? onThanksgivingNowChange : onThanksgivingNotYetChange;
      const Icon = now ? Heart : Sprout;
      return <section key={key} data-group={key} className={cn("morning-gratitude-panel", group === key && "is-active")} aria-label={now ? "Thank God for now" : "Thank God in advance"}>
        <div className="morning-panel-heading"><span className="morning-icon-bubble" data-tone={now ? "rose" : "green"}><Icon aria-hidden="true" /></span><div>
          <h2>{now ? "Thank God for now" : "Thank God in advance"}</h2>
          <p>{now ? "Name five gifts already in your life." : "Give thanks in faith for what has not yet come."}</p>
        </div></div>
        {group === key ? <MorningThanksgivingVoice key={key} group={key} values={values} onChange={onChange} />
          : <Button type="button" variant="outline" className="min-h-11" onClick={() => setGroup(key)}>Use voice for this list</Button>}
        <ol className="space-y-3">{Array.from({ length: THANKSGIVING_ITEM_COUNT }, (_, index) => <li key={index} className="morning-gratitude-row">
          <span className={cn("morning-gratitude-number", values[index]?.trim() && "is-filled")} aria-hidden="true">{values[index]?.trim() ? <Check /> : index + 1}</span>
          <Input value={values[index] ?? ""} onChange={(event) => onChange(index, event.target.value)} className={cn(lh.input, "min-w-0 flex-1")}
            aria-label={`${now ? "Thankful today" : "Thankful for what's ahead"} ${index + 1}`} placeholder={now ? "A person, a moment, a gift…" : "A hope or a promise…"} />
          <DictateButton userId={user?.id} webSpeechOnly className="h-11 w-11 shrink-0 rounded-full border border-border/60 bg-background" onAppend={(chunk) => {
            const spoken = chunk.trim(); if (!spoken) return;
            const existing = values[index] ?? "";
            onChange(index, existing.trim() ? `${existing.trimEnd()} ${spoken}` : spoken);
          }} />
        </li>)}</ol>
        <details className="mt-3 text-sm text-muted-foreground"><summary className="min-h-11 cursor-pointer py-3">Need a prompt?</summary>
          <ul className="space-y-2 pl-4 list-disc">{(now ? THANKSGIVING_NOW_PROMPTS : THANKSGIVING_NOT_YET_PROMPTS).map((prompt) => <li key={prompt}>{prompt}</li>)}</ul>
        </details>
        {now && <Button type="button" variant="outline" className="mt-2 min-h-11" onClick={() => setGroup("not-yet")}>Reflect on what's ahead</Button>}
      </section>;
    })}</div>
  </section></JournalAiPrivacy.Provider>;
}
