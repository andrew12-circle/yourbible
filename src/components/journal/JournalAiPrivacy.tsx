import { createContext, useContext } from "react";

/** UI guard shared by every writing field and capture control inside an entry. */
export const JournalAiPrivacy = createContext(true);
export function useJournalCloudAiPermission(): boolean {
  return useContext(JournalAiPrivacy);
}

export const JournalAiDocument = createContext<string | undefined>(undefined);
export function useJournalAiDocument(): string | undefined { return useContext(JournalAiDocument); }
