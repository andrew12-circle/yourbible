import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useMediaRecorderDictation } from "@/hooks/useMediaRecorderDictation";
import {
  isSpeechErrorToastWorthy,
  useSpeechDictation,
} from "@/hooks/useSpeechDictation";
import {
  isJournalVoiceEdgeUnavailable,
  isJournalVoiceTranscriptionFailure,
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

function isMediaInfraError(error: string): boolean {
  return /elevenlabs|journal-voice-to-text|ELEVENLABS|401|unauthorized/i.test(error);
}

function speechToastContent(
  error: string,
  webSpeechOnly: boolean,
): { title: string; description: string } | null {
  if (!isSpeechErrorToastWorthy(error)) return null;
  if (webSpeechOnly && isMediaInfraError(error)) return null;

  if (/microphone|mic for this site|allow microphone/i.test(error)) {
    return { title: "Allow microphone access", description: error };
  }
  if (/chrome, edge, or safari|secure \(https\)/i.test(error)) {
    return { title: "Try Chrome or Edge", description: error };
  }
  if (/no microphone was found/i.test(error)) {
    return { title: "No microphone found", description: error };
  }
  if (webSpeechOnly && /live speech recognition|hit a snag/i.test(error)) {
    return { title: "Dictation unavailable", description: error };
  }
  return { title: "Dictation", description: error };
}

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
  const media = useMediaRecorderDictation({
    userId: webSpeechOnly ? undefined : userId,
    onAppend,
    onInterim: handleInterim,
  });

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

  useEffect(() => {
    if (!error || error === lastToasted.current) return;
    lastToasted.current = error;

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

    const toastBody = speechToastContent(error, webSpeechOnly);
    if (!toastBody) return;
    toast({ ...toastBody, variant: "destructive" });
  }, [error, useMedia, webSpeechOnly, speech.supported]);

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
          disabled={webSpeechOnly ? !speech.supported || transcribing : !supported || transcribing}
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
              toast({
                title: "Try Chrome or Edge",
                description: WEB_SPEECH_UNSUPPORTED_MSG,
                variant: "destructive",
              });
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
