import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
import { SceneRehearsalPlayer } from "@/components/living-hope/SceneRehearsalPlayer";
import { useAuth } from "@/contexts/AuthContext";
import type { LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";
import {
  dailyRehearsalVariant, deepRehearsalDue, parseRehearsalNote,
  readRehearsalHistory, recordRehearsalVisit, rehearsalDay, REHEARSAL_FOCUSES,
  REHEARSAL_VARIANTS, suggestRehearsalScene, withoutRehearsalNote, writeRehearsalNote,
  type RehearsalFocus, type RehearsalMinutes, type RehearsalVariant, type RehearsalVisit,
} from "@/lib/livingHope/sceneRehearsal";

type Props = { workbook: LivingHopeWorkbookContent; visionRecall: string; onVisionRecallChange: (value: string) => void };
type Session = { sceneId: string; minutes: RehearsalMinutes; variant: RehearsalVariant };

export function VisionEmbodimentWalkthrough(props: Props) {
  const { user } = useAuth();
  return <VisionPractice key={user?.id ?? "signed-out"} {...props} userId={user?.id} />;
}

function VisionPractice({ workbook, visionRecall, onVisionRecallChange, userId }: Props & { userId?: string }) {
  const [day] = useState(() => rehearsalDay());
  const [focus, setFocus] = useState<RehearsalFocus>("all");
  const [chosenId, setChosenId] = useState("");
  const [minutes, setMinutes] = useState<RehearsalMinutes>(5);
  const [variant, setVariant] = useState<RehearsalVariant>(() => dailyRehearsalVariant(day));
  const [history, setHistory] = useState<RehearsalVisit[]>([]);
  const [historyWarning, setHistoryWarning] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const historyKey = userId ? `yb_scene_rehearsal_history_v1:${userId}` : null;

  useEffect(() => {
    if (!historyKey) return;
    try { setHistory(readRehearsalHistory(window.localStorage.getItem(historyKey))); }
    catch { setHistoryWarning("Practice history is unavailable on this device. Your morning notes still use the normal save flow."); }
  }, [historyKey]);

  const eligible = useMemo(() => workbook.stories.filter((scene) => scene.text.trim()), [workbook.stories]);
  const suggestion = useMemo(() => suggestRehearsalScene(eligible, focus, history, day), [eligible, focus, history, day]);
  const selected = eligible.find((scene) => scene.id === chosenId) ?? suggestion;
  const active = session ? eligible.find((scene) => scene.id === session.sceneId) : null;

  const complete = () => {
    if (!session || !active) return;
    const next = recordRehearsalVisit(history, { sceneId: active.id, day, minutes: session.minutes, variant: session.variant });
    setHistory(next);
    if (historyKey) {
      try { window.localStorage.setItem(historyKey, JSON.stringify(next)); }
      catch { setHistoryWarning("Could not retain rotation history on this device. Your action remains in the morning notes."); }
    }
  };

  const updateExtraNotes = (text: string) => {
    const note = parseRehearsalNote(visionRecall);
    onVisionRecallChange(note.sceneId ? writeRehearsalNote(text, note) : text);
  };

  const selectClass = "mt-1 min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="min-w-0 space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Live the Vision</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Put on headphones if you have them. Pick one saved scene and press Begin. For the next few minutes, enter it in first person:
          see it, hear it, feel it, rehearse how you live it, then bring one action back into today.
        </p>
      </div>

      {active && session ? (
        <SceneRehearsalPlayer
          key={`${userId}:${session.sceneId}:${session.minutes}:${session.variant}`}
          scene={active}
          minutes={session.minutes}
          variant={session.variant}
          value={visionRecall}
          onChange={onVisionRecallChange}
          onFinished={complete}
          onExit={() => setSession(null)}
        />
      ) : (
        <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
          <div className="grid min-w-0 gap-4 sm:grid-cols-[1fr_180px]">
            <label className="min-w-0 text-sm font-medium">
              One saved scene
              <select
                className={selectClass}
                value={selected?.id ?? ""}
                disabled={!eligible.length}
                onChange={(event) => setChosenId(event.target.value)}
              >
                {!eligible.length && <option value="">No scenes yet</option>}
                {eligible.map((scene) => <option key={scene.id} value={scene.id}>{scene.title || "Untitled scene"}</option>)}
              </select>
            </label>
            <label className="min-w-0 text-sm font-medium">
              Time
              <select className={selectClass} value={minutes} onChange={(event) => setMinutes(Number(event.target.value) as RehearsalMinutes)}>
                <option value={3}>3 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
              </select>
            </label>
          </div>

          {selected ? (
            <div className="rounded-xl bg-muted/25 p-4">
              <p className="text-sm font-semibold">{selected.title || "My scene"}</p>
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{selected.text}</p>
            </div>
          ) : null}

          <Button
            type="button"
            className="min-h-11"
            disabled={!selected}
            onClick={() => selected && setSession({ sceneId: selected.id, minutes, variant })}
          >
            Begin guided visualization
          </Button>

          <details className="rounded-xl border border-border/60 p-3">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">More options</summary>
            <div className="grid min-w-0 gap-4 pt-2 sm:grid-cols-2">
              <label className="min-w-0 text-sm font-medium">
                Focus today
                <select className={selectClass} value={focus} onChange={(event) => { setFocus(event.target.value as RehearsalFocus); setChosenId(""); }}>
                  {REHEARSAL_FOCUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="min-w-0 text-sm font-medium">
                Emphasis
                <select className={selectClass} value={variant} onChange={(event) => setVariant(event.target.value as RehearsalVariant)}>
                  {REHEARSAL_VARIANTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            </div>
            {deepRehearsalDue(history, day) ? (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                If you want a deeper session this week, choose 10 or 15 minutes. The normal morning version is 3–5 minutes.
              </p>
            ) : null}
          </details>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Your saved scene is only read for this practice. The original scene text and recording are not changed.
          </p>
        </section>
      )}

      {historyWarning && <p role="status" className="text-xs text-muted-foreground">{historyWarning}</p>}

      <details className="rounded-xl border border-border/60 p-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Wider vision and optional notes</summary>
        {workbook.vision_headline && <p className="my-3 text-base font-medium">{workbook.vision_headline}</p>}
        {workbook.lifestyle.length > 0 && <p className="mb-3 text-sm text-muted-foreground">{workbook.lifestyle.slice(0, 2).join(" · ")}</p>}
        <MorningVoiceField
          value={withoutRehearsalNote(visionRecall)}
          onChange={updateExtraNotes}
          multiline
          rows={5}
          label="Additional vision notes"
          placeholder="Light, sounds, temperature, a meaningful detail, or another reflection…"
        />
      </details>
    </div>
  );
}
