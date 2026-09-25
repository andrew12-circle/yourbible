import { useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MorningVoiceField } from "@/components/living-hope/MorningVoiceField";
import { useSceneRehearsalPlayback } from "@/hooks/useSceneRehearsalPlayback";
import {
  buildRehearsalBeats, emptyRehearsalNote,
  parseRehearsalNote, rehearsalNarration, writeRehearsalNote,
  type RehearsalMinutes, type RehearsalNote, type RehearsalScene, type RehearsalVariant,
} from "@/lib/livingHope/sceneRehearsal";

type Props = {
  scene: RehearsalScene;
  minutes: RehearsalMinutes;
  variant: RehearsalVariant;
  value: string;
  onChange: (value: string) => void;
  onFinished: () => void;
  onExit: () => void;
};

const optionalFields = [
  { key: "identity", label: "Who am I practicing being?", placeholder: "Patient, honest, present…" },
  { key: "obstacle", label: "If this cue or obstacle happens…", placeholder: "If I reach for my phone during dinner…" },
  { key: "response", label: "Then I will…", placeholder: "Put it away and ask one question." },
  { key: "when", label: "When or what will remind me?", placeholder: "After breakfast, at 5:00, when I close my laptop…" },
] as const;

export function SceneRehearsalPlayer({ scene, minutes, variant, value, onChange, onFinished, onExit }: Props) {
  const beats = useMemo(() => buildRehearsalBeats(scene, minutes, variant), [scene, minutes, variant]);
  const player = useSceneRehearsalPlayback(beats);
  const [note, setNote] = useState<RehearsalNote>(() => {
    const previous = parseRehearsalNote(value);
    return {
      ...(previous.sceneId === scene.id ? previous : emptyRehearsalNote()),
      sceneId: scene.id,
      title: scene.title || "My scene",
      completed: false,
    };
  });
  const [finished, setFinished] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [showScript, setShowScript] = useState("");

  if (!player.beat) return null;

  const script = rehearsalNarration(beats);
  const last = player.index === beats.length - 1;
  const incompletePlan = Boolean(note.obstacle.trim()) !== Boolean(note.response.trim());

  const editNote = (patch: Partial<RehearsalNote>) => {
    const next = { ...note, ...patch, completed: false };
    setNote(next);
    setFinished(false);
    onChange(writeRehearsalNote(value, next));
  };

  const finish = () => {
    if (finished || !note.action.trim() || incompletePlan) return;
    player.stop();
    const next = { ...note, completed: true };
    setNote(next);
    onChange(writeRehearsalNote(value, next));
    setFinished(true);
    onFinished();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopyStatus("Copied");
    } catch {
      setShowScript("show");
      setCopyStatus("Select the script below to copy it.");
    }
  };

  return (
    <section className="min-w-0 space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-6" aria-label="Guided scene rehearsal">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" className="min-h-11 gap-2" onClick={() => { player.stop(); onExit(); }}>
          <ArrowLeft className="h-4 w-4" /> Scene choices
        </Button>
        <span className="text-sm text-muted-foreground">{minutes >= 10 ? "Deep Vision" : "Live the Vision"} · {minutes}-minute target</span>
      </div>

      <h2 className="text-xl font-semibold">{scene.title || "My scene"}</h2>

      <div
        role="progressbar"
        aria-label="Visualization progress"
        aria-valuemin={0}
        aria-valuemax={beats.length}
        aria-valuenow={finished ? beats.length : player.index}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full bg-primary" style={{ width: `${(finished ? 1 : player.index / beats.length) * 100}%` }} />
      </div>

      <div className="rounded-xl bg-muted/30 p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>Cue {player.index + 1} of {beats.length}</span>
          <span className="tabular-nums" aria-label="Time left in this cue">
            {Math.floor(player.remaining / 60)}:{String(player.remaining % 60).padStart(2, "0")}
          </span>
        </div>
        <h3 className="mb-3 text-lg font-semibold" aria-live="polite">{player.beat.title}</h3>
        <p className="mx-auto max-w-3xl whitespace-pre-wrap text-base leading-8">{player.beat.text}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" className="min-h-11" disabled={player.index === 0 || finished} onClick={() => player.go(player.index - 1)}>
          Previous cue
        </Button>
        <Button type="button" className="min-h-11 gap-2" disabled={finished} onClick={player.toggle}>
          {player.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {player.running ? "Pause" : "Play guide"}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" disabled={last || finished} onClick={() => player.go(player.index + 1)}>
          Next / skip cue
        </Button>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={player.voiceEnabled}
          disabled={!player.voiceAvailable || finished}
          onChange={(event) => player.setVoiceEnabled(event.target.checked)}
        />
        Read cues aloud with device voice
      </label>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {player.voiceAvailable ? "No ElevenLabs request is made. " : "Device voice is unavailable here; all cues remain readable. "}
        The guide pauses if the app is hidden or another recording starts.
      </p>

      {player.voiceError && <p role="alert" className="text-sm text-destructive">{player.voiceError}</p>}

      {(last || finished) && (
        <div className="space-y-4 border-t border-border/60 pt-5">
          <div>
            <p className="mb-1 text-sm font-medium uppercase tracking-wide text-muted-foreground">Bring it into today</p>
            <h3 className="text-lg font-semibold">What does the man you just saw do today?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Say one specific action you control. This is the only answer you need before moving on.
            </p>
          </div>

          <MorningVoiceField
            value={note.action}
            onChange={(text) => editNote({ action: text })}
            label="Today's action"
            placeholder="One specific action you control today…"
            multiline
            rows={3}
          />

          <details className="rounded-xl border border-border/60 p-3">
            <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Make it more concrete (optional)</summary>
            <div className="space-y-4 pt-2">
              {optionalFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <p className="text-sm font-medium">{field.label}</p>
                  <MorningVoiceField
                    value={note[field.key]}
                    onChange={(text) => editNote({ [field.key]: text })}
                    label={field.label}
                    placeholder={field.placeholder}
                    multiline
                    rows={2}
                  />
                </div>
              ))}
            </div>
          </details>

          {incompletePlan ? (
            <p className="text-xs text-muted-foreground">If you use an if-then plan, complete both the obstacle and response.</p>
          ) : null}

          <Button type="button" className="min-h-11 gap-2" disabled={finished || !note.action.trim() || incompletePlan} onClick={finish}>
            {finished && <Check className="h-4 w-4" />}
            {finished ? "Ready for Step 6" : "Carry this into today"}
          </Button>

          {finished && (
            <p role="status" className="text-sm">
              Step 6 will bring this action forward so you can refine it before Today&apos;s Assignment.
            </p>
          )}
        </div>
      )}

      <details className="border-t border-border/60 pt-3 text-sm">
        <summary className="min-h-11 cursor-pointer py-3">Guided script for your own recording</summary>
        <p className="mb-2 text-muted-foreground">
          {script.length.toLocaleString()} / 4,750 characters. This practice script never replaces your saved scene.
        </p>
        <Button type="button" variant="outline" className="min-h-11 gap-2" onClick={() => void copy()}>
          <Copy className="h-4 w-4" /> Copy guided script
        </Button>
        <span role="status" className="ml-3">{copyStatus}</span>
        <Button type="button" variant="ghost" className="min-h-11" onClick={() => setShowScript((value) => value ? "" : "show")}>
          Show / hide script
        </Button>
        {showScript ? (
          <textarea aria-label="Guided narration script" readOnly value={script} className="mt-3 min-h-64 w-full rounded-lg border bg-background p-3 leading-7" />
        ) : null}
      </details>
    </section>
  );
}
