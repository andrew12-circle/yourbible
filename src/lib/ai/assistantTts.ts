import { supabase } from "@/integrations/supabase/client";

/** Strip markdown so TTS reads natural speech, not formatting cues. */
export function stripMarkdownForTts(md: string): string {
  let s = md;
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  s = s.replace(/^\s*#{1,6}\s+/gm, "");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/\*([^*]+)\*/g, "$1");
  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/_([^_]+)_/g, "$1");
  s = s.replace(/\s+/g, " ");
  return s.trim();
}

export type AssistantTtsSession = {
  stop: () => void;
  play: (markdown: string, playOptions?: { force?: boolean }) => Promise<void>;
};

/** ElevenLabs narration via sleep-tts — same voice quality as Sleep mode and Journal chat. */
export function createAssistantTtsSession(sessionOptions: {
  enabled: () => boolean;
  mounted?: () => boolean;
}): AssistantTtsSession {
  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;

  const stop = () => {
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  };

  const play = async (markdown: string, playOptions?: { force?: boolean }) => {
    const forced = playOptions?.force === true;
    if (!forced && !sessionOptions.enabled()) return;
    const text = stripMarkdownForTts(markdown);
    if (!text) return;
    stop();
    try {
      const { data, error } = await supabase.functions.invoke<ArrayBuffer>("sleep-tts", {
        body: { text: text.slice(0, 4500) },
      });
      if (error) return;
      if (sessionOptions.mounted && !sessionOptions.mounted()) return;
      if (!forced && !sessionOptions.enabled()) return;
      const buf = data as unknown;
      if (!(buf instanceof ArrayBuffer) || buf.byteLength === 0) return;
      const blob = new Blob([buf], { type: "audio/mpeg" });
      objectUrl = URL.createObjectURL(blob);
      const next = new Audio(objectUrl);
      audio = next;
      await next.play().catch(() => {});
    } catch {
      /* ignore TTS failures */
    }
  };

  return { stop, play };
}
