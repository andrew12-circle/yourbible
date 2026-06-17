import { create } from "zustand";

export const AI_WRITING_ASSIST_STORAGE_KEY = "yb_ai_writing_assist_v1";

function readPersisted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(AI_WRITING_ASSIST_STORAGE_KEY);
    if (raw === null) return true;
    return JSON.parse(raw) === true;
  } catch {
    return true;
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
  setAiWritingAssistEnabled: (enabled: boolean) => void;
}

export const useAiWritingAssistStore = create<AiWritingAssistState>((set) => ({
  aiWritingAssistEnabled: readPersisted(),
  setAiWritingAssistEnabled: (enabled) => {
    writePersisted(enabled);
    set({ aiWritingAssistEnabled: enabled });
  },
}));
