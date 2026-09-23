import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
import { SceneRehearsalPlayer } from "@/components/living-hope/SceneRehearsalPlayer";
import { useAuth } from "@/contexts/AuthContext";
import type { LivingHopeWorkbookContent } from "@/lib/livingHope/workbookTypes";
import {
  dailyRehearsalVariant, deepRehearsalDue, isProtectedRehearsalScene, parseRehearsalNote,
  readRehearsalHistory, recordRehearsalVisit, rehearsalDay, REHEARSAL_FOCUSES,
  REHEARSAL_VARIANTS, sceneFocus, suggestRehearsalScene, withoutRehearsalNote, writeRehearsalNote,
  type RehearsalFocus, type RehearsalMinutes, type RehearsalVariant, type RehearsalVisit,
} from "@/lib/livingHope/sceneRehearsal";

type Props = { workbook: LivingHopeWorkbookContent; visionRecall: string; onVisionRecallChange: (value: string) => void };
type Session = { sceneId: string; minutes: RehearsalMinutes; variant: RehearsalVariant };

export function VisionEmbodimentWalkthrough(props: Props) {
  const { user } = useAuth();
  // Remount account-scoped practice state rather than leaking it between sign-ins.
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
  const eligible = useMemo(() => workbook.stories.filter((s) => !isProtectedRehearsalScene(s) && s.text.trim()), [workbook.stories]);
  const suggestion = useMemo(() => suggestRehearsalScene(eligible, focus, history, day), [eligible, focus, history, day]);
  const selected = eligible.find((s) => s.id === chosenId) ?? suggestion;
  const active = session ? eligible.find((s) => s.id === session.sceneId) : null;
  const noFocusMatch = focus !== "all" && !eligible.some((s) => sceneFocus(s) === focus);
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
        <h2 className="text-xl font-semibold">See the life. Practice your part.</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Embodied Vision is guided practice: enter one moment, rehearse a useful response, surrender the outcome, and choose today's action.
          Play a Scene remains your full story and recording library. This practice does not predict what God will provide or when.
        </p>
      </div>
      {active && session ? (
        <SceneRehearsalPlayer key={`${userId}:${session.sceneId}:${session.minutes}:${session.variant}`}
          scene={active} minutes={session.minutes} variant={session.variant} value={visionRecall}
          onChange={onVisionRecallChange} onFinished={complete} onExit={() => setSession(null)} />
      ) : (
        <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <label className="min-w-0 text-sm font-medium">Focus today
              <select className={selectClass} value={focus} onChange={(e) => { setFocus(e.target.value as RehearsalFocus); setChosenId(""); }}>
                {REHEARSAL_FOCUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="min-w-0 text-sm font-medium">One scene
              <select className={selectClass} value={selected?.id ?? ""} disabled={!eligible.length} onChange={(e) => setChosenId(e.target.value)}>
                {!eligible.length && <option value="">No guided scenes yet</option>}
                {eligible.map((scene) => <option key={scene.id} value={scene.id}>{scene.title || "Untitled scene"}</option>)}
              </select>
            </label>
            <label className="min-w-0 text-sm font-medium">Practice length
              <select className={selectClass} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) as RehearsalMinutes)}>
                <option value={3}>Daily · 3 minutes</option><option value={5}>Daily · 5 minutes</option>
                <option value={10}>Deep Vision · 10 minutes</option><option value={15}>Deep Vision · 15 minutes</option>
              </select>
            </label>
            <label className="min-w-0 text-sm font-medium">Today's emphasis
              <select className={selectClass} value={variant} onChange={(e) => setVariant(e.target.value as RehearsalVariant)}>
                {REHEARSAL_VARIANTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Suggestions use your chosen focus and completed practices on this device. You can always choose another scene.
            {noFocusMatch && " No scene matches this focus yet, so another area is suggested."}
          </p>
          {deepRehearsalDue(history, day) && <p className="text-sm">Weekly option: Deep Vision walks through all 11 cues. Daily practice uses six compact cues with a rotating emphasis.</p>}
          <Button type="button" className="min-h-11" disabled={!selected} onClick={() => {
            if (selected && !isProtectedRehearsalScene(selected)) setSession({ sceneId: selected.id, minutes, variant });
          }}>Open guided rehearsal</Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            ACE Is Working and The House Is Put Together stay unchanged in Play a Scene and are excluded from guided transformations.
            No recordings are generated or replaced here. Choose one scene—not the entire library each morning.
          </p>
        </section>
      )}
      {historyWarning && <p role="status" className="text-xs text-muted-foreground">{historyWarning}</p>}
      <details className="rounded-xl border border-border/60 p-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Your wider vision and optional notes</summary>
        {workbook.vision_headline && <p className="my-3 text-base font-medium">{workbook.vision_headline}</p>}
        {workbook.lifestyle.length > 0 && <p className="mb-3 text-sm text-muted-foreground">{workbook.lifestyle.slice(0, 2).join(" · ")}</p>}
        <MorningVoiceField value={withoutRehearsalNote(visionRecall)} onChange={updateExtraNotes} multiline rows={5}
          label="Additional vision notes" placeholder="Light, sounds, temperature, a meaningful detail, or another reflection…" />
        <p className="mt-2 text-xs text-muted-foreground">Existing notes are kept. Goal dates belong in your plan; practice timers do not set deadlines for provision.</p>
      </details>
    </div>
  );
}
