import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useAppShellMode } from "@/hooks/useAppShellMode";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useSleepPlayback } from "@/hooks/useSleepPlayback";
import { SLEEP_VOICES, DEFAULT_SLEEP_VOICE_ID } from "@/lib/bible/sleepVoices";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  Loader2,
  Moon,
  Pause,
  Play,
  Repeat,
  Volume2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SETS = [
  { id: "psalm23", label: "Psalm 23", subtitle: "The Shepherd", book: "Psa", chapter: 23 },
  { id: "psalm91", label: "Psalm 91", subtitle: "Refuge", book: "Psa", chapter: 91 },
  { id: "psalm121", label: "Psalm 121", subtitle: "Help", book: "Psa", chapter: 121 },
  { id: "matt6", label: "Matthew 6", subtitle: "Worry not", book: "Mat", chapter: 6 },
  { id: "phil4", label: "Philippians 4", subtitle: "Peace", book: "Php", chapter: 4 },
] as const;

const SET_GRADIENTS: Record<string, string> = {
  psalm23: "linear-gradient(160deg, #1a0f2e 0%, #3d2463 42%, #6b4a8a 100%)",
  psalm91: "linear-gradient(160deg, #091134 0%, #122056 58%, #20357d 100%)",
  psalm121: "linear-gradient(160deg, #0c1a2e 0%, #1a3a5c 50%, #2a5a7a 100%)",
  matt6: "linear-gradient(160deg, #1a1208 0%, #3d2a14 45%, #5c4420 100%)",
  phil4: "linear-gradient(160deg, #0f1a14 0%, #1e3d2e 50%, #2d5a45 100%)",
};

export default function SleepPage() {
  const { user, loading } = useAuth();
  const { showHubShell } = useAppShellMode();
  const [voice, setVoice] = useState(DEFAULT_SLEEP_VOICE_ID);
  const [setId, setSetId] = useState(SETS[0].id);
  const [playAll, setPlayAll] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const fallbackToastShown = useRef(false);

  const {
    status,
    nowPlaying,
    progress,
    busy,
    start,
    stop,
    togglePause,
    setVolume: setPlaybackVolume,
    isActive,
    ttsEngine,
    elevenLabsAvailable,
    probeElevenLabs,
  } = useSleepPlayback();

  useEffect(() => {
    setPlaybackVolume(volume);
  }, [volume, setPlaybackVolume]);

  useEffect(() => {
    void probeElevenLabs(DEFAULT_SLEEP_VOICE_ID);
  }, [probeElevenLabs]);

  useEffect(() => {
    if (ttsEngine !== "browser" || !isActive || fallbackToastShown.current) return;
    fallbackToastShown.current = true;
    toast({
      title: "Using device voice",
      description:
        "ElevenLabs is unavailable. Set ELEVENLABS_API_KEY on sleep-tts in Supabase for Sarah, George, and other narrators.",
    });
  }, [ttsEngine, isActive]);

  if (!loading && !user) return <Navigate to="/auth" replace />;

  const activeSetId = nowPlaying?.setId ?? setId;
  const activeSet = SETS.find((s) => s.id === activeSetId) ?? SETS[0];
  const heroGradient = SET_GRADIENTS[activeSetId] ?? SET_GRADIENTS.psalm23;
  const isPlaying = status === "playing";
  const isPaused = status === "paused";
  const showSpinner = status === "loading" || busy;

  const handlePlay = async () => {
    if (isActive) {
      if (isPlaying) togglePause();
      else if (isPaused) togglePause();
      else stop();
      return;
    }
    try {
      await start({
        voiceId: voice,
        setId,
        playAll,
        sets: SETS.map((s) => ({ id: s.id, label: `${s.label} — ${s.subtitle}`, book: s.book, chapter: s.chapter })),
      });
    } catch (e) {
      console.error(e);
      toast({
        variant: "destructive",
        title: "Couldn't start",
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const displayTitle = nowPlaying?.title ?? activeSet.label;
  const displaySubtitle = nowPlaying?.subtitle ?? activeSet.subtitle;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "bg-[#050508] text-white flex flex-col relative overflow-hidden",
        showHubShell ? "h-full min-h-0" : "min-h-[100dvh]",
      )}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: isActive ? 0.55 : 0.35 }}
        transition={{ duration: 1.2 }}
        style={{ background: heroGradient }}
      />
      <motion.div
        className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/20 via-transparent to-black/90"
        aria-hidden
      />

      <header className="relative z-10 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Link to="/">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <motion.div
          className="flex items-center gap-2 text-white/70"
          animate={{ opacity: isActive ? 1 : 0.6 }}
        >
          <Moon className="w-3.5 h-3.5" />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Sleep</span>
        </motion.div>
        <motion.button
          type="button"
          onClick={() => setPlayAll((p) => !p)}
          disabled={isActive}
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider transition-all",
            playAll
              ? "bg-white/20 text-white"
              : "bg-white/5 text-white/50 hover:text-white/80",
            isActive && "opacity-40 pointer-events-none",
          )}
        >
          <Repeat className="w-3 h-3" />
          All
        </motion.button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col max-w-lg mx-auto w-full px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <section className="flex-1 flex flex-col items-center justify-center min-h-0 py-4">
          <motion.div
            layout
            className="relative w-[min(72vw,280px)] aspect-square rounded-2xl shadow-[0_24px_80px_-12px_rgba(0,0,0,0.65)] overflow-hidden mb-8"
            style={{ background: heroGradient }}
          >
            <motion.div
              className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"
              animate={{ scale: isPlaying ? [1, 1.02, 1] : 1 }}
              transition={{ duration: 4, repeat: isPlaying ? Infinity : 0, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ opacity: isPlaying ? [0.15, 0.35, 0.15] : 0.2 }}
              transition={{ duration: 3, repeat: isPlaying ? Infinity : 0 }}
            >
              <Moon className="w-16 h-16 text-white/30" strokeWidth={1} />
            </motion.div>
          </motion.div>

          <motion.div layout className="text-center w-full px-2 mb-6">
            <h1 className="font-display text-[1.75rem] leading-tight tracking-tight text-white mb-1">
              {isActive ? displayTitle : "Rest in the Word"}
            </h1>
            <p className="text-sm text-white/55 font-sans">
              {isActive ? displaySubtitle : "Scripture read softly — let it carry you to sleep."}
            </p>
          </motion.div>

          <motion.div
            className="w-full mb-8 px-1"
            initial={false}
            animate={{ opacity: isActive ? 1 : 0.35 }}
          >
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-white/90"
                style={{ width: `${Math.round(progress * 100)}%` }}
                transition={{ type: "tween", duration: 0.15 }}
              />
            </div>
            <motion.div className="flex justify-between mt-2 text-[10px] text-white/35 font-medium tabular-nums">
              <span>{isActive ? "Now playing" : "Ready"}</span>
              <span>{isActive ? `${Math.round(progress * 100)}%` : playAll ? "All passages" : activeSet.label}</span>
            </motion.div>
          </motion.div>

          <div className="flex items-center justify-center gap-8">
            {isActive && (
              <Button
                variant="ghost"
                size="icon"
                onClick={stop}
                className="rounded-full w-12 h-12 text-white/40 hover:text-white hover:bg-white/10"
                aria-label="Stop"
              >
                <span className="w-3 h-3 rounded-sm bg-current" />
              </Button>
            )}
            <motion.div whileTap={{ scale: 0.94 }}>
              <Button
                onClick={handlePlay}
                disabled={showSpinner && !isActive}
                className="rounded-full w-[4.5rem] h-[4.5rem] bg-white text-black hover:bg-white/90 shadow-[0_8px_40px_-8px_rgba(255,255,255,0.45)] border-0"
                aria-label={isPlaying ? "Pause" : isPaused ? "Resume" : "Play"}
              >
                {showSpinner && !isActive ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-8 h-8" fill="currentColor" />
                ) : (
                  <Play className="w-8 h-8 ml-0.5" fill="currentColor" />
                )}
              </Button>
            </motion.div>
            {isActive && <motion.div className="w-12" aria-hidden />}
          </div>
        </section>

        <section className="shrink-0 space-y-5 mt-auto">
          <motion.div
            className="rounded-2xl bg-black/35 backdrop-blur-xl border border-white/10 p-3"
            animate={{ opacity: isActive ? 0.65 : 1 }}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/40 mb-2.5 px-1">Scripture</p>
            <motion.div
              className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-none"
              style={{ scrollbarWidth: "none" }}
            >
              {SETS.map((s) => {
                const selected = !playAll && setId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={isActive}
                    onClick={() => {
                      setPlayAll(false);
                      setSetId(s.id);
                    }}
                    className={cn(
                      "shrink-0 rounded-xl px-4 py-2.5 text-left transition-all min-w-[7.5rem]",
                      selected
                        ? "bg-white text-black shadow-lg"
                        : "bg-white/8 text-white/75 hover:bg-white/14 border border-white/8",
                      isActive && !selected && "opacity-50",
                    )}
                  >
                    <motion.div
                      className="font-sans text-sm font-semibold leading-tight"
                      animate={{ opacity: selected ? 1 : 0.9 }}
                    >
                      {s.label}
                    </motion.div>
                    <div
                      className={cn(
                        "text-[11px] mt-0.5",
                        selected ? "text-black/55" : "text-white/40",
                      )}
                    >
                      {s.subtitle}
                    </div>
                  </button>
                );
              })}
            </motion.div>
          </motion.div>

          <motion.div
            className="rounded-2xl bg-black/35 backdrop-blur-xl border border-white/10 p-3"
            animate={{ opacity: isActive ? 0.65 : 1 }}
          >
            <div className="flex items-baseline justify-between mb-2.5 px-1 gap-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Voice</p>
              <p className="text-[10px] text-white/35 truncate text-right">
                {ttsEngine === "browser"
                  ? "Device voice (ElevenLabs unavailable)"
                  : elevenLabsAvailable === false
                    ? "ElevenLabs not configured — device voice on play"
                    : "ElevenLabs narration"}
              </p>
            </div>
            <motion.div
              className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
              style={{ scrollbarWidth: "none" }}
            >
              {SLEEP_VOICES.map((v) => {
                const selected = voice === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={isActive}
                    onClick={() => setVoice(v.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-2 text-center transition-all",
                      selected
                        ? "bg-white/20 text-white ring-1 ring-white/30"
                        : "bg-white/5 text-white/55 hover:bg-white/10 border border-white/8",
                      isActive && !selected && "opacity-50",
                    )}
                  >
                    <div className="text-xs font-medium">{v.name}</div>
                    <div className="text-[10px] text-white/35">{v.desc}</div>
                  </button>
                );
              })}
            </motion.div>
          </motion.div>

          <div className="flex items-center gap-3 px-1 pb-1">
            <Volume2 className="w-4 h-4 text-white/35 shrink-0" />
            <Slider
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={(v) => setVolume(v[0] / 100)}
              className="[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5 [&_[role=slider]]:border-white/30 [&_[role=slider]]:bg-white [&>span:first-child]:h-1 [&>span:first-child]:bg-white/15 [&_[data-orientation=horizontal]>.bg-primary]:bg-white/80"
            />
          </div>

          <p className="text-center text-[11px] text-white/30 pb-1">
            Playback continues through each passage — no need to tap again.
          </p>
        </section>
      </main>
    </motion.div>
  );
}
