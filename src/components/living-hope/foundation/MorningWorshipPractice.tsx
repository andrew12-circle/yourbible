import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { formatFormulaCountdown } from "@/lib/livingHope/morningFormulaTimer";
import { emptyWorshipPrayerTimer, parseTonguesMinutes, parseWorshipMode, parseWorshipPrayerTimer, pauseWorshipPrayer, startWorshipPrayer, TONGUES_MINUTES, startRemainingWorshipPrayer, worshipPrayerRemaining, type WorshipMode } from "@/lib/livingHope/morningWorshipPrayer";
import { parseMorningFoundation } from "@/lib/livingHope/morningFoundation";
import { useMorningFoundation } from "./MorningFoundationContext";

export function WorshipMusicChoice({ children }: { children: ReactNode }) {
  const context = useMorningFoundation();
  return !context || parseWorshipMode(context.day.worshipMode) !== "tongues" ? <>{children}</> : null;
}

export function MorningWorshipPractice() {
  const context = useMorningFoundation();
  const [now, setNow] = useState(Date.now);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const audio = useRef<AudioContext | null>(null);
  const latest = useRef(context);
  latest.current = context;
  const mode = parseWorshipMode(context?.day.worshipMode);
  const minutes = parseTonguesMinutes(context?.day.tonguesMinutes);
  const timer = context?.day.worshipPrayer ? parseWorshipPrayerTimer(context.day.worshipPrayer) : emptyWorshipPrayerTimer(minutes);
  const remaining = worshipPrayerRemaining(timer, now);
  const available = Math.max(0, context?.worshipRemainingMs ?? 0);
  const running = timer.startedAt != null;
  const ended = timer.hasStarted && remaining <= 0;
  const sound = context?.soundCuesEnabled !== false;
  const completedCue = useRef(false);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [running]);
  useEffect(() => {
    if (!running) return;
    if (remaining <= 0 || available <= 0) {
      latest.current?.onDayChange({ worshipPrayer: pauseWorshipPrayer(timer, now) });
      if (remaining <= 0 && !completedCue.current) {
        completedCue.current = true;
        const engine = audio.current;
        if (sound && engine?.state === "running") {
          const oscillator = engine.createOscillator(); const volume = engine.createGain();
          oscillator.frequency.value = 740; volume.gain.value = 0.08;
          oscillator.connect(volume); volume.connect(engine.destination);
          oscillator.start(); oscillator.stop(engine.currentTime + 0.2);
        }
      }
    }
  }, [remaining, available, running, now, timer, sound]);
  useEffect(() => () => {
    const current = latest.current;
    if (current?.day.worshipPrayer?.startedAt != null) current.onDayChange({ worshipPrayer: pauseWorshipPrayer(current.day.worshipPrayer) });
    if (audio.current) void audio.current.close().catch(() => undefined);
  }, []);
  if (!context) return null;

  const unlockSound = () => {
    if (!sound) return;
    try {
      const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return;
      audio.current ??= new Constructor();
      if (audio.current.state === "suspended") void audio.current.resume().catch(() => undefined);
    } catch { /* The visible timer remains available when sound is unavailable. */ }
  };
  const choose = async (nextMode: WorshipMode, nextMinutes = minutes) => {
    const nextTimer = nextMinutes === minutes ? pauseWorshipPrayer(timer) : { ...emptyWorshipPrayerTimer(nextMinutes), prayedToday: timer.prayedToday };
    context.onDayChange({ worshipMode: nextMode, tonguesMinutes: nextMinutes, worshipPrayer: nextTimer });
    completedCue.current = false; setSaving(true); setError("");
    try { await context.onSaveSettings({ ...parseMorningFoundation(context.workbook.morning_foundation), worshipMode: nextMode, tonguesMinutes: nextMinutes }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save your preference. Today's selection is still here."); }
    finally { setSaving(false); }
  };
  const start = (useRemaining = false) => {
    const at = Date.now(); unlockSound(); completedCue.current = false; setNow(at);
    context.onDayChange({ worshipPrayer: useRemaining ? startRemainingWorshipPrayer(timer, available, at) : startWorshipPrayer(timer, available, at) });
  };
  return <section className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-6" aria-label="Choose your worship practice">
    <div><h2 className="text-xl font-semibold">Sing, pray in tongues, or both.</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Give this time to God. Sing with your worship music, or sit and pray in the Spirit—quietly, in your heart, or aloud.</p></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Worship practice">{([["sing", "Sing"], ["tongues", "Pray in tongues"], ["both", "Both"]] as const).map(([key, label]) => <Button key={key} type="button" variant={mode === key ? "default" : "outline"} className="min-h-11" aria-pressed={mode === key} disabled={saving} onClick={() => void choose(key)}>{label}</Button>)}</div>
    {mode !== "sing" && <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">Prayer time</span>{TONGUES_MINUTES.map((value) => <Button key={value} type="button" variant={minutes === value ? "default" : "outline"} className="min-h-11" disabled={saving || running} aria-pressed={minutes === value} onClick={() => void choose(mode, value)}>{value} min</Button>)}</div>
      <div className="space-y-2"><p className="text-4xl font-semibold tabular-nums" role="timer" aria-label="Prayer in tongues time remaining">{formatFormulaCountdown(remaining)}</p><p className="text-sm text-muted-foreground">{ended ? "Prayer interval finished. Continue when you are ready." : running ? "Pray quietly or aloud. You do not need to speak into a microphone." : timer.hasStarted ? "Prayer timer paused." : "Start when you are ready."}</p></div>
      {mode === "both" && <p className="text-sm text-muted-foreground">Use this interval for prayer and the rest of Worship for singing. The two timers run together; this is not extra time added to the session.</p>}
      <div className="flex flex-wrap gap-2">
        {running ? <Button type="button" className="min-h-11" onClick={() => context.onDayChange({ worshipPrayer: pauseWorshipPrayer(timer) })}>Pause prayer timer</Button> : <Button type="button" className="min-h-11" disabled={ended || available < remaining || remaining <= 0} onClick={() => start()}>{timer.hasStarted ? "Resume prayer timer" : "Start prayer timer"}</Button>}
        <Button type="button" variant="ghost" className="min-h-11" disabled={running} onClick={() => { completedCue.current = false; context.onDayChange({ worshipPrayer: { ...emptyWorshipPrayerTimer(minutes), prayedToday: timer.prayedToday } }); }}>Reset prayer timer</Button>
      </div>
      {!running && !ended && available < remaining && <div className="space-y-2 rounded-xl border p-3"><p className="text-sm">Worship has {formatFormulaCountdown(available)} remaining—not enough for the full {formatFormulaCountdown(remaining)} prayer interval. Choose how to proceed; the app will not silently shorten it.</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="min-h-11" disabled={available < 1000} onClick={() => start(true)}>Use remaining worship time</Button>{context.onAddWorshipTime && <Button type="button" variant="outline" className="min-h-11" onClick={context.onAddWorshipTime}>Add 5 minutes to Worship</Button>}</div></div>}
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={timer.prayedToday} onChange={(event) => context.onDayChange({ worshipPrayer: { ...timer, prayedToday: event.target.checked } })} />I prayed in the Spirit today</label>
      <p className="text-xs leading-relaxed text-muted-foreground">No recording or transcription. The timer measures time, not whether you prayed; the check-in is yours. Leaving Worship pauses this prayer timer.</p>
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
