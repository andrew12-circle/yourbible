/** ElevenLabs premade voices used for Rest in the Word (sleep scripture). */
export type BrowserVoiceProfile = "female-soft" | "female-low" | "male-deep" | "female-bright";

export interface SleepVoice {
  /** ElevenLabs `voice_id` */
  id: string;
  name: string;
  desc: string;
  /** Shown in UI — these are official ElevenLabs default voices */
  provider: "ElevenLabs";
  browserProfile: BrowserVoiceProfile;
}

export const SLEEP_VOICES: SleepVoice[] = [
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    desc: "Soft, warm",
    provider: "ElevenLabs",
    browserProfile: "female-soft",
  },
  {
    id: "XrExE9yKIg1WjnnlVkGX",
    name: "Matilda",
    desc: "Gentle, low",
    provider: "ElevenLabs",
    browserProfile: "female-low",
  },
  {
    id: "JBFqnCBsd6RMkjVDRZzb",
    name: "George",
    desc: "Deep, calm",
    provider: "ElevenLabs",
    browserProfile: "male-deep",
  },
  {
    id: "FGY2WhTYpPnrIDTdsKH5",
    name: "Laura",
    desc: "Bright, kind",
    provider: "ElevenLabs",
    browserProfile: "female-bright",
  },
];

export const DEFAULT_SLEEP_VOICE_ID = SLEEP_VOICES[0]!.id;

export function getSleepVoice(voiceId: string): SleepVoice | undefined {
  return SLEEP_VOICES.find((v) => v.id === voiceId);
}

export function getBrowserProfile(voiceId: string): BrowserVoiceProfile {
  return getSleepVoice(voiceId)?.browserProfile ?? "female-soft";
}
