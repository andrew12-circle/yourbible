export const JOURNAL_CHAT_INCLUDE_GENERAL_KEY = "journal_chat.include_general";
export const JOURNAL_CHAT_VOICE_REPLIES_KEY = "journal_chat.voice_replies";

export function readJournalChatIncludeGeneralDefault(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(JOURNAL_CHAT_INCLUDE_GENERAL_KEY);
  if (v === "1" || v === "true") return true;
  return false;
}

export function persistJournalChatIncludeGeneral(value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(JOURNAL_CHAT_INCLUDE_GENERAL_KEY, value ? "1" : "0");
}

export function readJournalChatVoiceRepliesDefault(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem(JOURNAL_CHAT_VOICE_REPLIES_KEY);
  if (v === "1" || v === "true") return true;
  return false;
}

export function persistJournalChatVoiceReplies(value: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(JOURNAL_CHAT_VOICE_REPLIES_KEY, value ? "1" : "0");
}
