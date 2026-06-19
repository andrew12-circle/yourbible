import { create } from "zustand";

export const AI_WRITING_ASSIST_STORAGE_KEY = "yb_ai_writing_assist_v1";

function readPersisted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(AI_WRITING_ASSIST_STORAGE_KEY);
    if (raw === null) return false;
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

function writePersisted(enabled: boolean) {
  try {
    localStorage.setItem(AI_WRITING_ASSIST_STORAGE_KEY, JSON.stringify(enabled));
  } catch {
    /* ignore */
  }
}

interface AiWritingAssistState {
  aiWritingAssistEnabled: boolean;
  /** Set when the polish API fails — blocks retries until user re-enables assist. */
  polishUnavailable: boolean;
  setAiWritingAssistEnabled: (enabled: boolean) => void;
  markPolishUnavailable: () => void;
}

export const useAiWritingAssistStore = create<AiWritingAssistState>((set) => ({
  aiWritingAssistEnabled: readPersisted(),
  polishUnavailable: false,
  setAiWritingAssistEnabled: (enabled) => {
    writePersisted(enabled);
    set((state) => ({
      aiWritingAssistEnabled: enabled,
      polishUnavailable: enabled ? false : state.polishUnavailable,
    }));
  },
  markPolishUnavailable: () => {
    writePersisted(false);
    set({ aiWritingAssistEnabled: false, polishUnavailable: true });
  },
}));
