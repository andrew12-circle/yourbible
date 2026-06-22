import { create } from "zustand";
import { isAiWritingAssistDefaultOn } from "@/lib/ai/aiWritingAssistPolicy";

export const AI_WRITING_ASSIST_STORAGE_KEY = "yb_ai_writing_assist_v1";

function userPrefsKey(userId: string): string {
  return `yb_ai_writing_assist_v2_${userId}`;
}

function readUserPref(userId: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(userPrefsKey(userId));
    if (raw === null) return null;
    return JSON.parse(raw) === true;
  } catch {
    return null;
  }
}

function writeUserPref(userId: string, enabled: boolean) {
  try {
    localStorage.setItem(userPrefsKey(userId), JSON.stringify(enabled));
  } catch {
    /* ignore */
  }
}

interface AiWritingAssistState {
  userId: string | null;
  aiWritingAssistEnabled: boolean;
  /** Set when the polish API fails — blocks retries until user re-enables assist. */
  polishUnavailable: boolean;
  initForUser: (
    userId: string | null,
    user?: { email?: string | null; displayName?: string | null },
  ) => void;
  setAiWritingAssistEnabled: (enabled: boolean) => void;
  markPolishUnavailable: () => void;
}

export const useAiWritingAssistStore = create<AiWritingAssistState>((set, get) => ({
  userId: null,
  aiWritingAssistEnabled: false,
  polishUnavailable: false,
  initForUser: (userId, user) => {
    if (!userId) {
      set({ userId: null, aiWritingAssistEnabled: false, polishUnavailable: false });
      return;
    }

    const pref = readUserPref(userId);
    const enabled = pref ?? isAiWritingAssistDefaultOn(user ?? {});
    set({
      userId,
      aiWritingAssistEnabled: enabled,
      polishUnavailable: false,
    });
  },
  setAiWritingAssistEnabled: (enabled) => {
    const userId = get().userId;
    if (userId) writeUserPref(userId, enabled);
    set((state) => ({
      aiWritingAssistEnabled: enabled,
      polishUnavailable: enabled ? false : state.polishUnavailable,
    }));
  },
  markPolishUnavailable: () => {
    const userId = get().userId;
    if (userId) writeUserPref(userId, false);
    set({ aiWritingAssistEnabled: false, polishUnavailable: true });
  },
}));
