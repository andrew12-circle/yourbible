import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useMediaRecorderDictation } from "@/hooks/useMediaRecorderDictation";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import {
  isJournalVoiceEdgeUnavailable,
  isJournalVoiceTranscriptionFailure,
  probeJournalVoiceEdge,
} from "@/lib/journal/voiceDictation";
import { cn } from "@/lib/utils";

export type DictateButtonHandle = { stop: () => void; toggle: () => void };

export type DictateButtonProps = {
  userId?: string;
  onAppend: (chunk: string) => void;
  onInterim?: (partial: string) => void;
  /** Fires when the browser speech session starts/stops (for silence-based auto-send, etc.). */
  onListeningChange?: (listening: boolean) => void;
  /** Browser Web Speech API only — no record-and-transcribe fallback. */
  webSpeechOnly?: boolean;
  language?: string;
  size?: "sm" | "md";
  className?: string;
};

const LS_MEDIA_FALLBACK = "journal.dictation.prefer_media";

function readPersistedMediaFallback(): boolean {
  try {
    return localStorage.getItem(LS_MEDIA_FALLBACK) === "1";
  } catch {
    return false;
  }
}

function clearPersistedMediaFallback(): void {
  try {
    localStorage.removeItem(LS_MEDIA_FALLBACK);
  } catch {
    /* ignore */
  }
}

const WEB_SPEECH_UNSUPPORTED_MSG =
  "Live dictation needs Chrome, Edge, or Safari. Enable microphone access in your browser settings.";

export const DictateButton = forwardRef<DictateButtonHandle, DictateButtonProps>(function DictateButton(
  { userId, onAppend, onInterim, onListeningChange, webSpeechOnly = false, language, size = "sm", className },
  ref,
) {
  const onListeningChangeRef = useRef(onListeningChange);
  onListeningChangeRef.current = onListeningChange;
  const interimRef = useRef("");

  const handleInterim = (text: string) => {
    interimRef.current = text;
    onInterim?.(text);
  };

  const [preferMedia, setPreferMedia] = useState(() => {
    // Legacy: clear sticky record-and-transcribe mode so live Web Speech (with interim) is preferred.
    if (readPersistedMediaFallback()) {
      clearPersistedMediaFallback();
    }
    return false;
  });

  useEffect(() => {
    if (webSpeechOnly) clearPersistedMediaFallback();
  }, [webSpeechOnly]);

  const speech = useSpeechDictation({ onAppend, onInterim: handleInterim, language });
  const media = useMediaRecorderDictation({ userId, onAppend, onInterim: handleInterim });

  const useMedia = !webSpeechOnly && (preferMedia || !speech.supported);

  const active = useMedia ? media : speech;
  const { listening, error, stop, toggle } = active;
  const transcribing = useMedia && media.transcribing;
  const supported = useMedia ? media.supported : speech.supported;

  const prevListeningRef = useRef(false);

  useImperativeHandle(ref, () => ({ stop, toggle }), [stop, toggle]);

  useEffect(() => {
    onListeningChangeRef.current?.(listening || transcribing);
  }, [listening, transcribing]);

  useEffect(() => {
    const activeNow = listening || transcribing;
    const wasActive = prevListeningRef.current;
    prevListeningRef.current = activeNow;
    if (wasActive && !activeNow) {
      const interim = interimRef.current.trim();
      if (interim) {
        onAppend(`${interim} `);
        interimRef.current = "";
        onInterim?.("");
      }
    }
  }, [listening, transcribing, onAppend, onInterim]);

  const lastToasted = useRef<string | null>(null);
  const switchingRef = useRef(false);

  useEffect(() => {
    if (!error || error === lastToasted.current) return;
    lastToasted.current = error;

    const isNetworkish =
      error.includes("Network") ||
      error.includes("service not allowed") ||
      error.includes("snag");

    if (useMedia && isJournalVoiceEdgeUnavailable(error)) {
      clearPersistedMediaFallback();
      setPreferMedia(false);
      const canRetrySpeech = speech.supported;
      toast({
        title: "Voice transcription unavailable",
        description: canRetrySpeech
          ? `${error} Live dictation will be used next time you tap the mic.`
          : error,
        variant: "destructive",
      });
      return;
    }

    if (useMedia && isJournalVoiceTranscriptionFailure(error)) {
      clearPersistedMediaFallback();
      setPreferMedia(false);
      const canRetrySpeech = speech.supported;
      toast({
        title: "Record-and-transcribe failed",
        description: canRetrySpeech
          ? `${error} Tap the mic again for live captions as you speak.`
          : error,
        variant: "destructive",
      });
      return;
    }

    if (
      !webSpeechOnly &&
      !useMedia &&
      isNetworkish &&
      media.supported &&
      userId &&
      !switchingRef.current
    ) {
      switchingRef.current = true;
      void (async () => {
        const edgeOk = await probeJournalVoiceEdge();
        switchingRef.current = false;
        if (!edgeOk) {
          toast({
            title: "Record-and-transcribe unavailable",
            description:
              "journal-voice-to-text is not deployed. Run: npx supabase functions deploy journal-voice-to-text --project-ref itmcsyrnpcnrwviigppe and set ELEVENLABS_API_KEY. Live dictation will keep trying.",
            variant: "destructive",
          });
          return;
        }
        clearPersistedMediaFallback();
        setPreferMedia(true);
        speech.stop();
        toast({
          title: "Switching dictation mode",
          description: "Live captions failed — tap the mic to record, then tap again to transcribe.",
        });
      })();
      return;
    }

    toast({ title: "Dictation", description: error, variant: "destructive" });
  }, [error, useMedia, webSpeechOnly, media.supported, userId, speech]);

  useEffect(() => {
    if (!error) lastToasted.current = null;
  }, [error]);

  const iconClass = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const btnClass = size === "md" ? "h-10 w-10" : "h-8 w-8";

  const tip = webSpeechOnly && !speech.supported
    ? "Live dictation needs Chrome, Edge, or Safari"
    : !supported
      ? "Voice dictation isn't supported in this browser yet."
      : transcribing
      ? "Transcribing…"
      : listening
        ? useMedia
          ? "Tap to finish and transcribe"
          : "Stop dictation"
        : useMedia
          ? "Record voice (tap again when done)"
          : "Dictate";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={webSpeechOnly ? transcribing : !supported || transcribing}
          aria-pressed={listening}
          aria-label={listening ? "Stop dictation" : "Dictate"}
          className={cn(
            btnClass,
            "relative shrink-0 text-muted-foreground hover:text-foreground",
            listening && "text-primary",
            className,
          )}
          onClick={() => {
            if (webSpeechOnly && !speech.supported) {
              toast({ title: "Voice dictation unavailable", description: WEB_SPEECH_UNSUPPORTED_MSG });
              return;
            }
            if (supported) toggle();
          }}
        >
          {transcribing ? (
            <Loader2 className={cn(iconClass, "animate-spin")} />
          ) : listening ? (
            <>
              <span
                className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-red-500"
                aria-hidden
              />
              <MicOff className={iconClass} />
              <span className="sr-only">Listening…</span>
            </>
          ) : (
            <Mic className={iconClass} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tip}</TooltipContent>
    </Tooltip>
  );
});
