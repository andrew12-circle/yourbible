export const MY_AI_VOICE_REPLIES_KEY = "my_ai.voice_replies";

export function readMyAiVoiceRepliesDefault(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(MY_AI_VOICE_REPLIES_KEY);
  if (v === "1" || v === "true") return true;
  return false;
}

export function persistMyAiVoiceReplies(value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MY_AI_VOICE_REPLIES_KEY, value ? "1" : "0");
}
