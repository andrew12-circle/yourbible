import type { BrowserVoiceProfile } from "./sleepVoices";

const MALE_HINT =
  /male|daniel|alex|david|james|mark|microsoft david|google uk english male|aaron|fred|ralph/i;
const FEMALE_HINT =
  /female|samantha|victoria|karen|moira|fiona|zira|susan|hazel|linda|sara|jenny|aria|emma|natasha|google us english/i;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }
  const existing = window.speechSynthesis.getVoices();
  if (existing.length) return Promise.resolve(existing);

  return new Promise((resolve) => {
    const finish = () => resolve(window.speechSynthesis.getVoices());
    const onVoices = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoices);
      finish();
    };
    window.speechSynthesis.addEventListener("voiceschanged", onVoices);
    setTimeout(finish, 600);
  });
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  profile: BrowserVoiceProfile,
): SpeechSynthesisVoice | null {
  const en = voices.filter((v) => v.lang.startsWith("en"));
  if (!en.length) return voices[0] ?? null;

  const female = en.filter((v) => FEMALE_HINT.test(v.name) && !MALE_HINT.test(v.name));
  const male = en.filter((v) => MALE_HINT.test(v.name));

  switch (profile) {
    case "male-deep":
      return male[0] ?? en.find((v) => MALE_HINT.test(v.name)) ?? en[0] ?? null;
    case "female-low":
      return female[female.length - 1] ?? female[0] ?? en[0] ?? null;
    case "female-bright":
      return female[0] ?? en[0] ?? null;
    case "female-soft":
    default:
      return female[0] ?? en[0] ?? null;
  }
}

export function isBrowserTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Calm device TTS when ElevenLabs is unavailable (matches sleep pacing). */
export function speakBrowserTts(
  text: string,
  profile: BrowserVoiceProfile,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    if (!isBrowserTtsSupported()) {
      reject(new Error("Browser speech not supported"));
      return;
    }

    void loadVoices().then((voices) => {
      if (signal.aborted) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.88;
      utterance.pitch =
        profile === "male-deep" ? 0.85 : profile === "female-low" ? 0.92 : 1;
      const voice = pickVoice(voices, profile);
      if (voice) utterance.voice = voice;

      const onAbort = () => {
        window.speechSynthesis.cancel();
        resolve();
      };
      signal.addEventListener("abort", onAbort, { once: true });

      utterance.onend = () => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      };
      utterance.onerror = () => {
        signal.removeEventListener("abort", onAbort);
        reject(new Error("Browser TTS failed"));
      };

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  });
}

export function pauseBrowserTts(): void {
  window.speechSynthesis?.pause();
}

export function resumeBrowserTts(): void {
  window.speechSynthesis?.resume();
}

export function stopBrowserTts(): void {
  window.speechSynthesis?.cancel();
}
