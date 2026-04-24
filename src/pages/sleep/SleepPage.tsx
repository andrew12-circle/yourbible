import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { fetchPassage, fetchSleepAudio } from "@/lib/bible/api";
import { ChevronLeft, Loader2, Pause, Play, Moon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", desc: "Soft, warm" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", desc: "Gentle, low" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", desc: "Deep, calm" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", desc: "Bright, kind" },
];

const SETS = [
  { id: "psalm23", label: "Psalm 23 — The Shepherd", book: "Psa", chapter: 23 },
  { id: "psalm91", label: "Psalm 91 — Refuge", book: "Psa", chapter: 91 },
  { id: "psalm121", label: "Psalm 121 — Help", book: "Psa", chapter: 121 },
  { id: "matt6", label: "Matthew 6 — Worry not", book: "Mat", chapter: 6 },
  { id: "phil4", label: "Philippians 4 — Peace", book: "Php", chapter: 4 },
];

const LS_BIBLE_KEY = "yb.bibleId";

export default function SleepPage() {
  const { user, loading } = useAuth();
  const [voice, setVoice] = useState(VOICES[0].id);
  const [setId, setSetId] = useState(SETS[0].id);
  const [volume, setVolume] = useState(0.8);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => { audioRef.current?.pause(); audioRef.current = null; }, []);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  if (!loading && !user) return <Navigate to="/auth" replace />;

  const start = async () => {
    setBusy(true);
    try {
      const bibleId = localStorage.getItem(LS_BIBLE_KEY);
      if (!bibleId) {
        toast({ variant: "destructive", title: "Choose a translation in the reader first." });
        setBusy(false); return;
      }
      const set = SETS.find(s => s.id === setId)!;
      const passage = await fetchPassage(bibleId, set.book, set.chapter);
      const text = passage.verses.map(v => v.text).join("  …  ");
      const blob = await fetchSleepAudio(text, voice);
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = volume;
      audio.onended = () => setPlaying(false);
      audioRef.current?.pause();
      audioRef.current = audio;
      // Fade-in
      audio.volume = 0;
      await audio.play();
      setPlaying(true);
      let v = 0;
      const target = volume;
      const fade = setInterval(() => {
        v = Math.min(target, v + 0.04);
        if (audioRef.current) audioRef.current.volume = v;
        if (v >= target) clearInterval(fade);
      }, 120);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Couldn't start", description: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const stop = () => {
    if (!audioRef.current) return;
    const target = audioRef.current;
    let v = target.volume;
    const fade = setInterval(() => {
      v = Math.max(0, v - 0.05);
      target.volume = v;
      if (v <= 0) { target.pause(); clearInterval(fade); }
    }, 100);
    setPlaying(false);
  };

  return (
    <div className="min-h-screen bg-leather-deep text-paper relative overflow-hidden">
      {/* Drifting starlight */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        {[...Array(40)].map((_, i) => (
          <motion.div key={i}
            className="absolute w-0.5 h-0.5 rounded-full bg-gold-bright"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ opacity: [0.2, 0.7, 0.2] }}
            transition={{ duration: 3 + (i % 5), repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
      </div>

      <header className="relative z-10 px-5 py-4 flex items-center justify-between">
        <Link to="/"><Button variant="ghost" size="icon" className="text-paper hover:text-gold-bright"><ChevronLeft className="w-5 h-5" /></Button></Link>
        <div className="flex items-center gap-2 text-gold-bright"><Moon className="w-4 h-4" /><span className="font-display text-sm uppercase tracking-widest">Sleep mode</span></div>
        <div className="w-10" />
      </header>

      <main className="relative z-10 max-w-md mx-auto px-6 pt-8 pb-12">
        <h1 className="font-display text-3xl text-center mb-2">Rest in the Word</h1>
        <p className="text-center text-paper/60 text-sm mb-10">Choose what to hear, then let it carry you to sleep.</p>

        <section className="mb-8">
          <h2 className="text-[10px] uppercase tracking-widest text-gold-bright/80 mb-3">Scripture</h2>
          <div className="space-y-2">
            {SETS.map(s => (
              <button key={s.id} onClick={() => setSetId(s.id)}
                className={`w-full text-left p-3 rounded-md border transition-all font-scripture text-base ${setId === s.id ? "border-gold bg-leather/40" : "border-paper/10 hover:border-paper/30"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-[10px] uppercase tracking-widest text-gold-bright/80 mb-3">Voice</h2>
          <div className="grid grid-cols-2 gap-2">
            {VOICES.map(v => (
              <button key={v.id} onClick={() => setVoice(v.id)}
                className={`p-3 rounded-md border text-center transition-all ${voice === v.id ? "border-gold bg-leather/40" : "border-paper/10 hover:border-paper/30"}`}>
                <div className="font-display">{v.name}</div>
                <div className="text-[10px] text-paper/50">{v.desc}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-[10px] uppercase tracking-widest text-gold-bright/80 mb-3">Volume</h2>
          <Slider value={[volume * 100]} max={100} step={1} onValueChange={(v) => setVolume(v[0] / 100)} />
        </section>

        <div className="flex items-center justify-center">
          <AnimatePresence mode="wait">
            {playing ? (
              <motion.div key="stop" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
                <Button onClick={stop} className="rounded-full w-20 h-20 bg-gold text-leather-deep hover:bg-gold-bright shadow-gold">
                  <Pause className="w-7 h-7" fill="currentColor" />
                </Button>
              </motion.div>
            ) : (
              <motion.div key="play" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
                <Button onClick={start} disabled={busy} className="rounded-full w-20 h-20 bg-gold text-leather-deep hover:bg-gold-bright shadow-gold">
                  {busy ? <Loader2 className="w-7 h-7 animate-spin" /> : <Play className="w-7 h-7 ml-1" fill="currentColor" />}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="text-center text-xs text-paper/40 mt-4">This silences the app — your phone is yours to set to Do Not Disturb.</p>
      </main>
    </div>
  );
}
